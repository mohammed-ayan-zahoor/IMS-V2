"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
    Card, 
    Typography, 
    Button, 
    Form, 
    Input, 
    InputNumber, 
    Select, 
    DatePicker,
    Space, 
    Row, 
    Col,
    Spin
} from "antd";
import { 
    ArrowLeftOutlined,
    BankOutlined,
    SafetyCertificateOutlined,
    PhoneOutlined,
    UserOutlined,
    EnvironmentOutlined,
    ThunderboltOutlined,
    SaveOutlined
} from "@ant-design/icons";
import { useToast } from "@/contexts/ToastContext";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function EditInstitutePage() {
    const toast = useToast();
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [instituteName, setInstituteName] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        const fetchInstitute = async () => {
            try {
                const res = await fetch(`/api/v1/institutes/${params.id}`, {
                    signal: controller.signal
                });
                if (!res.ok) throw new Error("Could not find organization data.");
                const data = await res.json();
                const inst = data.institute;
                if (!inst) throw new Error("Institute data not found.");
                
                setInstituteName(inst.name || "");
                
                form.setFieldsValue({
                    name: inst.name || "",
                    code: inst.code || "",
                    contactPhone: inst.contactPhone || "",
                    addressStr: inst.addressStr || "",
                    status: inst.status || "active",
                    maxStudents: inst.limits?.maxStudents || 500,
                    plan: inst.subscription?.plan || "free",
                    endDate: inst.subscription?.endDate ? dayjs(inst.subscription.endDate) : null
                });
            } catch (error) {
                if (error.name === "AbortError") return;
                toast.error(error.message);
                router.push("/super-admin/institutes");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchInstitute();

        return () => controller.abort();
    }, [params.id, form, router, toast]);

    const handleSubmit = async (values) => {
        setSaving(true);
        
        const payload = {
            ...values,
            endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : ""
        };

        try {
            const res = await fetch(`/api/v1/institutes/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to synchronize updates.");
            }

            toast.success("Organization archives updated successfully.");
            router.push("/super-admin/institutes");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link href="/super-admin/institutes">
                    <Button icon={<ArrowLeftOutlined />} />
                </Link>
                <div>
                    <Title level={2} style={{ marginBottom: 0 }}>Modify Instance</Title>
                    <Text type="secondary">Update institutional parameters for {instituteName}</Text>
                </div>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Card title={<><BankOutlined style={{ color: '#1677ff', marginRight: 8 }} />Core Repository</>} style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item 
                                label="Legal Entity Name" 
                                name="name" 
                                rules={[{ required: true, message: 'Please enter the organization name' }]}
                            >
                                <Input prefix={<BankOutlined style={{ color: '#bfbfbf' }} />} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item 
                                label="Auth Code (Immutable)" 
                                name="code" 
                            >
                                <Input 
                                    prefix={<SafetyCertificateOutlined style={{ color: '#bfbfbf' }} />} 
                                    disabled
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Contact Matrix" name="contactPhone">
                                <Input prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} />
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
                            <Form.Item label="Operational Status" name="status">
                                <Select>
                                    <Option value="active">Active High-Trust</Option>
                                    <Option value="suspended">Suspended / Restricted</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Service Plan" name="plan">
                                <Select>
                                    <Option value="free">Free Trial / Standard</Option>
                                    <Option value="basic">Basic Plan</Option>
                                    <Option value="professional">Professional Plan</Option>
                                    <Option value="enterprise">Enterprise Plan</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Subscription Expiry Date (Optional)" name="endDate">
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col xs={24}>
                            <Form.Item label="Registered Address" name="addressStr">
                                <TextArea 
                                    rows={3} 
                                    prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />} 
                                />
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
                        loading={saving}
                        style={{ width: '100%' }}
                    >
                        Synchronize Updates
                    </Button>
                </div>
            </Form>
        </Space>
    );
}
