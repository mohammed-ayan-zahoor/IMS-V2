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
    Alert
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
    SaveOutlined
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
        
        // Ensure code is uppercase
        const payload = {
            ...values,
            code: values.code?.toUpperCase()
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
                    maxStudents: 500
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
                        <Col xs={24}>
                            <Form.Item label="Organization Type" name="type" extra="Type is immutable after creation.">
                                <Radio.Group optionType="button" buttonStyle="solid">
                                    <Radio value="VOCATIONAL">Vocational</Radio>
                                    <Radio value="SCHOOL">School</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
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
