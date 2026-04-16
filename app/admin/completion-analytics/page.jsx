"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Loader,
  Download
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CompletionAnalyticsPage = () => {
  const { data: session } = useSession();
  const toast = useToast();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/students/completion-analytics", {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        } else {
          toast.error("Failed to load analytics");
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        toast.error("Error loading analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-slate-500">Failed to load analytics</p>
        </div>
      </div>
    );
  }

  const {
    totalStudents,
    activeStudents,
    completedStudents,
    droppedStudents,
    completionRate,
    dropoutRate,
    monthlyTrends,
    statusDistribution,
    completionByReason,
  } = analytics;

  const COLORS = ["#10b981", "#3b82f6", "#ef4444"];

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card padding="p-6" className="premium-card-hover">
        <div className="flex justify-between items-start">
          <div>
            <p className="section-label text-sm">{label}</p>
            <h3 className="metric-value text-slate-900 mt-2">{value}</h3>
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="text-white" size={20} />
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="premium-card-hover">
          <CardHeader>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Completion Analytics
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Track student completion metrics and trends
              </p>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            label="Total Students"
            value={totalStudents}
            icon={Users}
            color="bg-blue-500"
          />
          <StatCard
            label="Active"
            value={activeStudents}
            icon={TrendingUp}
            color="bg-yellow-500"
          />
          <StatCard
            label="Completed"
            value={completedStudents}
            icon={CheckCircle}
            color="bg-green-500"
          />
          <StatCard
            label="Dropped"
            value={droppedStudents}
            icon={AlertCircle}
            color="bg-red-500"
          />
          <StatCard
            label="Completion Rate"
            value={`${completionRate}%`}
            icon={TrendingUp}
            color="bg-purple-500"
          />
        </div>
      </motion.div>

      {/* Charts Grid */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Status Distribution Pie Chart */}
        <Card padding="p-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Status Distribution
            </h2>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends Bar Chart */}
        <Card padding="p-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Monthly Trends
            </h2>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="completed"
                  fill="#10b981"
                  name="Completed"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="active"
                  fill="#3b82f6"
                  name="Active"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="dropped"
                  fill="#ef4444"
                  name="Dropped"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Completion by Reason */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card padding="p-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Completions by Reason
            </h2>
          </CardHeader>
          <CardContent>
            {completionByReason && completionByReason.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completionByReason}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="reason" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Completions"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center p-8">
                <p className="text-slate-500">No completion data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card padding="p-6">
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">
              Summary
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">Completion Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-green-600">
                    {completionRate}%
                  </p>
                  <Badge variant="success">
                    {completedStudents} completed
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Dropout Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-red-600">
                    {dropoutRate}%
                  </p>
                  <Badge variant="error">
                    {droppedStudents} dropped
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-2">Active Students</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-blue-600">
                    {activeStudents}
                  </p>
                  <Badge variant="info">
                    {((activeStudents / totalStudents) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card padding="p-4" className="bg-blue-50 border border-blue-200">
          <div className="flex gap-3">
            <TrendingUp className="text-blue-600 flex-shrink-0" size={20} />
            <div className="text-sm text-slate-700">
              <p className="font-medium mb-1">Analytics Insights:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-600">
                <li>
                  Completion rate: {completedStudents} out of {totalStudents} students
                </li>
                <li>
                  Dropout rate: {droppedStudents} students have dropped out
                </li>
                <li>
                  {activeStudents} students are currently active
                </li>
                <li>
                  Use completion tracking and certificate management pages to manage students
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default CompletionAnalyticsPage;
