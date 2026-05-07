import TransportFee from '@/models/TransportFee';
import TransportFeePreset from '@/models/TransportFeePreset';
import Vehicle from '@/models/Vehicle';
import Session from '@/models/Session';
import Collector from '@/models/Collector';
import { format, addMonths, differenceInMonths, startOfMonth } from 'date-fns';
import mongoose from 'mongoose';

export class TransportService {
    /**
     * Initialize transport fee for a student
     */
    static async initializeTransportFee(studentId, instituteId, sessionId, presetId, routeId, vehicleId, pickupStop, actorId, customMaxCycles = null) {
        try {
            const preset = await TransportFeePreset.findById(presetId);
            if (!preset) throw new Error("Transport fee preset not found");

            const session = await Session.findById(sessionId);
            if (!session) throw new Error("Academic session not found");

            // Use custom limit if provided, otherwise use preset limit
            const effectiveMaxCycles = customMaxCycles !== null ? parseInt(customMaxCycles) : preset.maxCycles;

            // Generate installments based on cycle
            const installments = this.generateInstallments(session, { ...preset.toObject(), maxCycles: effectiveMaxCycles });

            // Create transport fee record
            const transportFee = await TransportFee.create({
                institute: instituteId,
                session: sessionId,
                student: studentId,
                route: routeId,
                vehicle: vehicleId,
                preset: presetId,
                billingCycle: preset.billingCycle,
                feePerCycle: preset.amount,
                maxCycles: effectiveMaxCycles,
                installments,
                status: 'not_started'
            });

            // Update vehicle occupancy
            if (vehicleId) {
                await this.updateVehicleOccupancy(vehicleId);
            }

            return transportFee;
        } catch (error) {
            console.error("[TRANSPORT_SERVICE] Initialization failed:", error);
            throw error;
        }
    }

    /**
     * Generate installments based on billing cycle and session duration
     */
    static generateInstallments(session, preset) {
        const installments = [];
        const start = new Date(session.startDate);
        const end = new Date(session.endDate);
        const cycle = preset.billingCycle;
        const amount = preset.amount;

        if (cycle === 'monthly') {
            let current = startOfMonth(start);
            let totalMonths = differenceInMonths(end, start) + 1;
            if (preset.maxCycles) totalMonths = Math.min(totalMonths, preset.maxCycles);
            
            for (let i = 0; i < totalMonths; i++) {
                installments.push({
                    month: format(current, 'yyyy-MM'),
                    label: format(current, 'MMMM yyyy'),
                    amount: amount,
                    dueDate: current,
                    status: 'pending'
                });
                current = addMonths(current, 1);
            }
        } else if (cycle === 'quarterly') {
            let current = startOfMonth(start);
            let totalMonths = differenceInMonths(end, start) + 1;
            if (preset.maxCycles) totalMonths = Math.min(totalMonths, preset.maxCycles * 3);
            
            const totalQuarters = Math.ceil(totalMonths / 3);
            
            for (let i = 0; i < totalQuarters; i++) {
                installments.push({
                    month: `Q${i + 1}-${format(current, 'yyyy')}`,
                    label: `Quarter ${i + 1} (${format(current, 'MMM')} - ${format(addMonths(current, 2), 'MMM yyyy')})`,
                    amount: amount,
                    dueDate: current,
                    status: 'pending'
                });
                current = addMonths(current, 3);
            }
        } else if (cycle === 'annual') {
            installments.push({
                month: format(start, 'yyyy'),
                label: `Annual Fee (${format(start, 'yyyy')}-${format(end, 'yy')})`,
                amount: amount,
                dueDate: start,
                status: 'pending'
            });
        }

        return installments;
    }

    /**
     * Sync vehicle occupancy count
     */
    static async updateVehicleOccupancy(vehicleId) {
        const User = mongoose.model('User');
        const count = await User.countDocuments({
            'transport.vehicle': vehicleId,
            'transport.isAvailing': true,
            deletedAt: null
        });

        await Vehicle.findByIdAndUpdate(vehicleId, {
            currentOccupancy: count
        });
    }

    /**
     * Get transport fee for a student
     */
    static async getTransportFee(studentId, sessionId) {
        return await TransportFee.findOne({
            student: studentId,
            session: sessionId,
            deletedAt: null
        }).populate('route vehicle preset');
    }

    /**
     * Soft delete/cancel transport fee
     */
    static async cancelTransportFee(feeId, actorId) {
        const fee = await TransportFee.findById(feeId);
        if (!fee) throw new Error("Transport fee record not found");

        fee.deletedAt = new Date();
        fee.deletedBy = actorId;
        fee.status = 'cancelled';
        await fee.save();

        // Update vehicle occupancy
        if (fee.vehicle) {
            await this.updateVehicleOccupancy(fee.vehicle);
        }

        return true;
    }

    /**
     * Record a payment for transport fee
     */
    static async recordPayment(feeId, paymentData, actorId) {
        const fee = await TransportFee.findById(feeId);
        if (!fee) throw new Error("Transport fee record not found");

        const { amount, method, transactionId, notes, collectedBy, date, installmentId } = paymentData;

        // If specific installment selected
        if (installmentId && installmentId !== 'adhoc') {
            const inst = fee.installments.id(installmentId);
            if (inst) {
                inst.status = 'paid';
                inst.paidDate = date ? new Date(date) : new Date();
                inst.paymentMethod = method;
                inst.transactionId = transactionId;
                inst.collectedBy = collectedBy;
                inst.notes = notes;
            }
        } else {
            // Find first pending installment
            const pendingInst = fee.installments.find(i => i.status === 'pending');
            if (pendingInst) {
                pendingInst.status = 'paid';
                pendingInst.paidDate = date ? new Date(date) : new Date();
                pendingInst.paymentMethod = method;
                pendingInst.transactionId = transactionId;
                pendingInst.collectedBy = collectedBy;
                pendingInst.notes = notes;
            }
        }

        await fee.save(); // Pre-save hook updates balanceAmount and status

        // 4. Update Collector Balance
        if (collectedBy) {
            try {
                const collector = await Collector.findOne({ 
                    name: collectedBy, 
                    institute: fee.institute 
                });
                
                if (collector) {
                    collector.currentBalance = (collector.currentBalance || 0) + (parseFloat(amount) || 0);
                    await collector.save();
                }
            } catch (collErr) {
                console.error("Failed to update collector balance in transport payment:", collErr);
            }
        }

        return fee;
    }
}
