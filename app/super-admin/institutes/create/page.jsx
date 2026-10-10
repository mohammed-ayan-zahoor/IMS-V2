"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    Card, 
    Typography, 
    Button, 
    Form, 
    Input, 
    InputNumber, 
    Radio, 
    Space, 
    Row, 
    Col,
    Divider,
    Alert,
    DatePicker
} from "antd";
import { 
    ArrowLeftOutlined,
    BankOutlined,
    SafetyCertificateOutlined,
    PhoneOutlined,
    UserOutlined,
    EnvironmentOutlined,
    MailOutlined,
    LockOutlined,
    SaveOutlined,
    DollarOutlined
} from "@ant-design/icons";
import { useToast } from "@/contexts/ToastContext";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CreateInstitutePage() {
    const toast = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        setLoading(true);
        
        // ponytail: student direct paywall fee calculation (18% GST + 2% PG processing)
        const isStudentPaywall = values.billingModel === 'STUDENT_DIRECT_PAY';
        const basePrice = isStudentPaywall ? (Number(values.studentBasePrice) || 25) : 25;
        const gstAmount = Math.round((basePrice * 0.18) * 100) / 100;
        const gatewayFee = Math.round((basePrice * 0.02) * 100) / 100;
        const studentTotalAmount = Math.round((basePrice + gstAmount + gatewayFee) * 100) / 100;

        // Ensure code is uppercase
        const payload = {
            ...values,
            code: values.code?.toUpperCase(),
            studentBasePrice: basePrice,
            studentTotalAmount: studentTotalAmount
        };

        try {
            const res = await fetch("/api/v1/institutes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const contentType = res.headers.get("content-type");
                let errorMessage = "Failed to create institute.";

                if (contentType?.includes("application/json")) {
                    const data = await res.json();
                    if (data.error && typeof data.error === 'string') {
                        errorMessage = data.error;
                    }
                }
                throw new Error(errorMessage);
            }
            toast.success("Institute protocol initialized successfully!");
            router.push("/super-admin/institutes");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/super-admin/institutes">
                    <Button icon={<ArrowLeftOutlined />} />
                </Link>
                <div>
                    <Title level={2} style={{ marginBottom: 0 }}>Register Organization</Title>
                    <Text type="secondary">Provision new institutional nodes on the network.</Text>
                </div>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    type: "VOCATIONAL",
                    maxStudents: 500,
                    billingModel: "INSTITUTE_PAID",
                    studentBasePrice: 25
                }}
            >
                <Card title={<><BankOutlined style={{ color: '#1677ff', marginRight: 8 }} />Organization Profile</>} style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item 
                                label="Organization Legal Name" 
                                name="name" 
                                rules={[{ required: true, message: 'Please enter the organization name' }]}
                            >
                                <Input prefix={<BankOutlined style={{ color: '#bfbfbf' }} />} placeholder="e.g. Acme University" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item 
                                label="Institutional ID (Unique Code)" 
                                name="code" 
                                rules={[{ required: true, message: 'Please enter a unique code' }]}
                            >
                                <Input 
                                    prefix={<SafetyCertificateOutlined style={{ color: '#bfbfbf' }} />} 
                                    placeholder="e.g. ACME_UNI" 
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Direct Support Line" name="contactPhone">
                                <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} placeholder="Contact number" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item 
                                label="Max Students Allowed" 
                                name="maxStudents" 
                                rules={[{ required: true, message: 'Please specify max students' }]}
                            >
                                <InputNumber 
                                    prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
                                    style={{ width: '100%' }} 
                                    min={1} 
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Organization Type" name="type" extra="Type is immutable after creation.">
                                <Radio.Group optionType="button" buttonStyle="solid">
                                    <Radio value="VOCATIONAL">Vocational</Radio>
                                    <Radio value="SCHOOL">School</Radio>
                                    <Radio value="COLLEGE">College / Higher-Ed</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                            {({ getFieldValue }) => 
                                getFieldValue('type') === 'COLLEGE' ? (
                                    <Col xs={24} md={12}>
                                        <Form.Item 
                                            label="Academic Structure" 
                                            name="structure" 
                                            initialValue="SEMESTER_BASED"
                                            tooltip="Choose CLASS_BASED for PU / Intermediate / 11th-12th / Junior Colleges, or SEMESTER_BASED for Degree colleges."
                                        >
                                            <Radio.Group optionType="button" buttonStyle="solid">
                                                <Radio value="SEMESTER_BASED">Degree (Semesters)</Radio>
                                                <Radio value="CLASS_BASED">PU / 11th-12th (Classes)</Radio>
                                            </Radio.Group>
                                        </Form.Item>
                                    </Col>
                                ) : null
                            }
                        </Form.Item>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24}>
                            <Form.Item label="Registered Address" name="addressStr">
                                <TextArea 
                                    rows={3} 
                                    placeholder="Full address of the organization" 
                                    prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} 
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <Card 
                    title={<><DollarOutlined style={{ color: '#52c41a', marginRight: 8 }} />Student License & Fee Collection Model</>} 
                    style={{ marginBottom: 24 }}
                >
                    <Form.Item 
                        label="Who Pays for Student Portal & Digital ID Cards?" 
                        name="billingModel"
                        extra="Determine whether the school pays your platform in bulk or if students pay individually on first login."
                    >
                        <Radio.Group optionType="button" buttonStyle="solid">
                            <Radio value="INSTITUTE_PAID">School Pays Platform (B2B SaaS)</Radio>
                            <Radio value="STUDENT_DIRECT_PAY">Student Pays Platform (B2B2C Student Paywall)</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.billingModel !== curr.billingModel || prev.studentBasePrice !== curr.studentBasePrice}>
                        {({ getFieldValue }) => {
                            if (getFieldValue('billingModel') !== 'STUDENT_DIRECT_PAY') return null;

                            const rawBase = getFieldValue('studentBasePrice');
                            const basePrice = (rawBase !== undefined && rawBase !== null && !isNaN(rawBase)) ? Number(rawBase) : 25;
                            const gstAmount = Math.round((basePrice * 0.18) * 100) / 100;
                            const gatewayFee = Math.round((basePrice * 0.02) * 100) / 100;
                            const totalAmount = Math.round((basePrice + gstAmount + gatewayFee) * 100) / 100;

                            return (
                                <>
                                    <Row gutter={16}>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Academic Session Expiration Date" 
                                                name="cycleEndDate"
                                                rules={[{ required: true, message: 'Please select the session expiry date' }]}
                                                tooltip="All student subscriptions for this school will expire synchronously on this exact date (e.g. 31st March)."
                                            >
                                                <DatePicker style={{ width: '100%' }} placeholder="Select cycle expiry (e.g. 31 Mar)" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={12}>
                                            <Form.Item 
                                                label="Base Student License Fee" 
                                                name="studentBasePrice"
                                                rules={[{ required: true, message: 'Please enter the base student fee' }]}
                                                tooltip="Base annual fee per student before 18% GST and 2% payment gateway processing."
                                            >
                                                <InputNumber 
                                                    prefix="₹" 
                                                    min={1}
                                                    precision={2}
                                                    style={{ width: '100%' }} 
                                                    placeholder="25.00"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <div style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 8,
                                        padding: '14px 16px',
                                        marginBottom: 16
                                    }}>
                                        <Text strong style={{ fontSize: 13, color: '#0f172a', display: 'block', marginBottom: 10 }}>
                                            Automated Student Fee Breakdown (18% GST + 2% PG Fee):
                                        </Text>
                                        <Row gutter={[16, 12]} align="middle">
                                            <Col xs={12} sm={6}>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Base License</Text>
                                                <Text strong style={{ fontSize: 14 }}>₹{basePrice.toFixed(2)}</Text>
                                            </Col>
                                            <Col xs={12} sm={6}>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>+ GST (18%)</Text>
                                                <Text strong style={{ fontSize: 14, color: '#475569' }}>₹{gstAmount.toFixed(2)}</Text>
                                            </Col>
                                            <Col xs={12} sm={6}>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>+ Gateway (2%)</Text>
                                                <Text strong style={{ fontSize: 14, color: '#475569' }}>₹{gatewayFee.toFixed(2)}</Text>
                                            </Col>
                                            <Col xs={12} sm={6}>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Charged to Parent</Text>
                                                <Text strong style={{ fontSize: 16, color: '#1677ff' }}>₹{totalAmount.toFixed(2)}</Text>
                                            </Col>
                                        </Row>
                                    </div>
                                </>
                            );
                        }}
                    </Form.Item>
                </Card>

                <Card title={<><LockOutlined style={{ color: '#faad14', marginRight: 8 }} />Root Auditor Credential</>} style={{ background: '#fafafa' }}>
                    <Alert 
                        title="Initializing first-tier administrator for the organization." 
                        type="info" 
                        showIcon 
                        style={{ marginBottom: 24 }} 
                    />
                    
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Full Legal Name" name="adminName">
                                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Admin name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item 
                                label="Official Email Access" 
                                name="adminEmail" 
                                rules={[
                                    { required: true, message: 'Please enter admin email' },
                                    { type: 'email', message: 'Please enter a valid email' }
                                ]}
                            >
                                <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="admin@acme.edu" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24}>
                            <Form.Item 
                                label="Secure Access Key" 
                                name="adminPassword" 
                                rules={[
                                    { required: true, message: 'Please enter a password' },
                                    { min: 12, message: 'Password must be at least 12 characters' }
                                ]}
                            >
                                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Minimum 12 characters" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        size="large" 
                        icon={<SaveOutlined />} 
                        loading={loading}
                        style={{ width: '100%' }}
                    >
                        Provision High-Level Access
                    </Button>
                </div>
            </Form>
        </Space>
    );
}
