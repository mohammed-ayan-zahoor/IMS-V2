"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Card, 
    Statistic, 
    Row, 
    Col, 
    Typography, 
    Table, 
    Badge, 
    List, 
    Button, 
    Modal, 
    Form, 
    Switch, 
    Select, 
    InputNumber, 
    Input,
    Progress,
    Space,
    Result,
    Spin
} from "antd";
import { 
    BankOutlined,
    TeamOutlined, 
    CreditCardOutlined, 
    PlusOutlined, 
    ArrowRightOutlined, 
    ApiOutlined, 
    DatabaseOutlined, 
    GlobalOutlined, 
    PhoneOutlined, 
    ClockCircleOutlined,
    ThunderboltOutlined
} from "@ant-design/icons";
import { useToast } from "@/contexts/ToastContext";

const { Title, Text, Paragraph } = Typography;

export default function SuperAdminDashboard() {
    const toast = useToast();
    const [stats, setStats] = useState({
        institutes: 0,
        totalUsers: 0,
        activeSubscriptions: 0,
        trendInstitutes: "...",
        trendUsers: "...",
        trendSubscriptions: "..."
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [voiceReports, setVoiceReports] = useState([]);
    const [recentCalls, setRecentCalls] = useState([]);
    const [voiceLoading, setVoiceLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedInstitute, setSelectedInstitute] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalSaving, setModalSaving] = useState(false);
    const [form] = Form.useForm();

    const openManageModal = async (instId) => {
        const matchingReport = voiceReports.find(r => r.id === instId);
        setSelectedInstitute(matchingReport || { id: instId, name: "Institute Settings" });
        setIsModalOpen(true);
        setModalLoading(true);
        form.resetFields();
        try {
            const res = await fetch(`/api/v1/institutes/${instId}`);
            if (res.ok) {
                const data = await res.json();
                const inst = data.institute;
                if (inst) {
                    form.setFieldsValue({
                        voiceCallsQuota: inst.usage?.voiceCallsQuota ?? 5000,
                        voiceCallsSent: inst.usage?.voiceCallsSent ?? 0,
                        overdueVoiceReminderEnabled: inst.notifications?.overdueVoiceReminderEnabled ?? false,
                        dedicatedCallerId: inst.notifications?.dedicatedCallerId ?? "",
                        voiceCallProvider: inst.notifications?.voiceCallProvider ?? "mock"
                    });
                }
            } else {
                toast.error("Failed to load detailed settings");
            }
        } catch (err) {
            console.error("Error fetching institute details:", err);
            toast.error("Error loading detailed settings");
        } finally {
            setModalLoading(false);
        }
    };

    const handleSaveSettings = async (values) => {
        if (!selectedInstitute) return;
        setModalSaving(true);
        try {
            const res = await fetch(`/api/v1/institutes/${selectedInstitute.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });

            if (res.ok) {
                toast.success("Voice configurations updated successfully");
                
                setVoiceReports(prev => prev.map(report => {
                    if (report.id === selectedInstitute.id) {
                        return {
                            ...report,
                            voiceCallsQuota: values.voiceCallsQuota,
                            voiceCallsSent: values.voiceCallsSent,
                            enabled: values.overdueVoiceReminderEnabled,
                            estimatedCost: parseFloat((values.voiceCallsSent * 0.70).toFixed(2))
                        };
                    }
                    return report;
                }));

                setIsModalOpen(false);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update voice configurations");
            }
        } catch (err) {
            console.error("Error saving voice settings:", err);
            toast.error("Error updating configurations");
        } finally {
            setModalSaving(false);
        }
    };

    useEffect(() => {
        const fetchVoiceReports = async () => {
            try {
                const res = await fetch("/api/admin/voice-billing-reports");
                if (res.ok) {
                    const data = await res.json();
                    setVoiceReports(data.reports || []);
                    setRecentCalls(data.recentCalls || []);
                }
            } catch (err) {
                console.error("Failed to load voice reports:", err);
            } finally {
                setVoiceLoading(false);
            }
        };
        fetchVoiceReports();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/admin/stats", { signal: controller.signal });
                if (!res.ok) throw new Error("Failed to load stats");
                const data = await res.json();
                setStats({
                    institutes: data.institutes || 0,
                    totalUsers: data.totalUsers || 0,
                    activeSubscriptions: data.activeSubscriptions || 0,
                    trendInstitutes: data.trendInstitutes || "+0% this month",
                    trendUsers: data.trendUsers || "+0 today",
                    trendSubscriptions: data.trendSubscriptions || "+0 new trials"
                });
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Stats fetch error:", error);
                    setError("Failed to load dashboard stats.");
                    toast.error("Failed to load dashboard stats");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        return () => controller.abort();
    }, []);

    if (error) {
        return (
            <Result
                status="error"
                title="System Error"
                subTitle={error}
                extra={
                    <Button type="primary" onClick={() => window.location.reload()}>
                        Retry Connection
                    </Button>
                }
            />
        );
    }

    const tableColumns = [
        {
            title: 'Institute',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Status',
            dataIndex: 'enabled',
            key: 'enabled',
            filters: [
                { text: 'Enabled', value: true },
                { text: 'Disabled', value: false },
            ],
            onFilter: (value, record) => record.enabled === value,
            render: (enabled) => (
                <Badge status={enabled ? 'success' : 'default'} text={enabled ? 'Enabled' : 'Disabled'} />
            )
        },
        {
            title: 'Calls Sent / Quota',
            key: 'quota',
            render: (_, record) => (
                <div style={{ minWidth: 150 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                        <span>{record.voiceCallsSent} calls</span>
                        <span>/ {record.voiceCallsQuota}</span>
                    </div>
                    <Progress 
                        percent={record.voiceCallsQuota > 0 ? (record.voiceCallsSent / record.voiceCallsQuota) * 100 : 0} 
                        showInfo={false} 
                        status={record.voiceCallsSent >= record.voiceCallsQuota ? 'exception' : 'active'}
                        size="small"
                    />
                </div>
            )
        },
        {
            title: 'Est. Cost',
            dataIndex: 'estimatedCost',
            key: 'estimatedCost',
            sorter: (a, b) => a.estimatedCost - b.estimatedCost,
            render: (cost) => `₹${cost.toLocaleString()}`
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Button size="small" onClick={() => openManageModal(record.id)}>Manage</Button>
            )
        }
    ];

    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
            <div>
                <Title level={2} style={{ marginBottom: 4 }}>System Overview</Title>
                <Text type="secondary">Monitoring the pulse of your education platform.</Text>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <Card loading={loading}>
                        <Statistic 
                            title="Total Institutes" 
                            value={stats.institutes} 
                            prefix={<BankOutlined style={{ color: '#1677ff' }} />} 
                            suffix={<span style={{ fontSize: '14px', color: '#52c41a' }}>{stats.trendInstitutes}</span>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card loading={loading}>
                        <Statistic 
                            title="Total Users" 
                            value={stats.totalUsers} 
                            prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                            suffix={<span style={{ fontSize: '14px', color: '#52c41a' }}>{stats.trendUsers}</span>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card loading={loading}>
                        <Statistic 
                            title="Active Subscriptions" 
                            value={stats.activeSubscriptions} 
                            prefix={<CreditCardOutlined style={{ color: '#faad14' }} />}
                            suffix={<span style={{ fontSize: '14px', color: '#52c41a' }}>{stats.trendSubscriptions}</span>}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={15}>
                    <Card title={<><ThunderboltOutlined style={{ color: '#1677ff', marginRight: 8 }} />Quick Actions</>} loading={loading}>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Card type="inner" actions={[<Link href="/super-admin/institutes/create" key="create"><Button type="primary" block icon={<PlusOutlined />}>Register Institute</Button></Link>]}>
                                    <Card.Meta title="Register Institute" description="Onboard a new organization to the platform." />
                                </Card>
                            </Col>
                            <Col span={12}>
                                <Card type="inner" actions={[<Link href="/super-admin/institutes" key="manage"><Button block icon={<ArrowRightOutlined />}>Manage Directory</Button></Link>]}>
                                    <Card.Meta title="Manage Directory" description="Audit and manage all registered institutes." />
                                </Card>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col xs={24} lg={9}>
                    <Card title={<><ApiOutlined style={{ color: '#52c41a', marginRight: 8 }} />System Node</>} loading={loading} style={{ height: '100%' }}>
                        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                            <Card type="inner" size="small">
                                <Space justify="space-between" style={{ display: 'flex', width: '100%' }}>
                                    <Badge status="processing" text="Cluster Active" />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>v2.4.0-STABLE</Text>
                                </Space>
                            </Card>
                            <div>
                                {[
                                    { icon: <DatabaseOutlined />, label: 'MongoDB Core', status: 'Optimized' },
                                    { icon: <GlobalOutlined />, label: 'API Mesh', status: 'Healthy' }
                                ].map((item, index) => (
                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: index === 0 ? '1px solid #f0f0f0' : 'none' }}>
                                        <Space><Text type="secondary">{item.icon}</Text> <Text>{item.label}</Text></Space>
                                        <Text strong>{item.status}</Text>
                                    </div>
                                ))}
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <div>
                <Title level={4}><PhoneOutlined /> Voice Call Reminders & Billing</Title>
                <Text type="secondary">Monitor credits consumption, calling metrics, and transaction logs across all institutes.</Text>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card title="Institute Calling Metrics" extra={<Badge color="blue" text="Exotel Shared Pool" />}>
                        <Table 
                            dataSource={voiceReports} 
                            columns={tableColumns} 
                            rowKey="id" 
                            loading={voiceLoading}
                            pagination={{ pageSize: 5 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Recent Activity Log" extra={<Badge color="gray" text="Live System Calls" />}>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {voiceLoading ? (
                                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                                    <Spin />
                                </div>
                            ) : recentCalls.length === 0 ? (
                                <div style={{ padding: '40px 0', textAlign: 'center', color: '#bfbfbf' }}>
                                    <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 8 }} /><br/>No call history logged yet.
                                </div>
                            ) : (
                                recentCalls.map((item, index) => (
                                    <div key={item.id || index} style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text strong>{item.studentName}</Text>
                                            <Badge status={item.status === 'success' ? 'success' : 'error'} text={item.status} style={{ textTransform: 'capitalize' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#888' }}>{item.schoolName}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4 }}>
                                                <span>Type: {item.feeType}</span>
                                                <span>Cost: ₹{item.cost}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: 4, color: '#bfbfbf' }}>
                                                <span>{item.phone}</span>
                                                <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {item.status === 'failed' && item.error && (
                                                <div style={{ color: '#cf1322', background: '#fff1f0', padding: '4px 8px', borderRadius: '4px', marginTop: 4, fontSize: '12px' }}>
                                                    Err: {item.error}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            <Modal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                title={`Manage Voice Calling: ${selectedInstitute?.name || ''}`}
                footer={null}
                width={600}
            >
                <Spin spinning={modalLoading} description="Retrieving organization settings...">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSaveSettings}
                        style={{ marginTop: 24 }}
                    >
                        <Card size="small" style={{ marginBottom: 16 }}>
                            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Automated Reminders</div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>Trigger voice calls to parent/guardian on cross overdue day.</Text>
                                </div>
                                <Form.Item name="overdueVoiceReminderEnabled" valuePropName="checked" noStyle>
                                    <Switch />
                                </Form.Item>
                            </Space>
                        </Card>

                        <Form.Item name="voiceCallProvider" label="Gateway Provider">
                            <Select>
                                <Select.Option value="mock">Console Mock (Development)</Select.Option>
                                <Select.Option value="exotel">Exotel Platform Master</Select.Option>
                                <Select.Option value="twilio">Twilio</Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="voiceCallsQuota" label="Calls Quota Limit" rules={[{ required: true }]}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item label="Calls Sent Consumption" style={{ marginBottom: 0 }}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="voiceCallsSent" noStyle rules={[{ required: true }]}>
                                    <InputNumber min={0} style={{ width: 'calc(100% - 100px)' }} />
                                </Form.Item>
                                <Button danger onClick={() => form.setFieldsValue({ voiceCallsSent: 0 })} style={{ width: '100px' }}>
                                    Reset to 0
                                </Button>
                            </Space.Compact>
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 24 }}>Currently tracked voice reminders dispatched. You can modify or reset this counter.</Text>

                        <Form.Item name="dedicatedCallerId" label="Dedicated Caller ID (Optional)">
                            <Input placeholder="e.g. +91XXXXXXXXXX" />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="primary" htmlType="submit" loading={modalSaving}>
                                    Save Settings
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
        </Space>
    );
}
