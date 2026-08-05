"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    Card, 
    Table, 
    Typography, 
    Button, 
    Input, 
    Space, 
    Badge, 
    Modal, 
    Tag,
    Tooltip
} from "antd";
import { 
    PlusOutlined, 
    EditOutlined, 
    StopOutlined, 
    DeleteOutlined, 
    CheckCircleOutlined,
    SearchOutlined
} from "@ant-design/icons";
import { useToast } from "@/contexts/ToastContext";

const { Title, Text } = Typography;
const { confirm } = Modal;

export default function InstitutesPage() {
    const router = useRouter();
    const toast = useToast();
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");

    useEffect(() => {
        fetchInstitutes();
    }, []);

    const fetchInstitutes = async () => {
        setLoading(true);
        try {
            const controller = new AbortController();
            const res = await fetch("/api/v1/institutes", { signal: controller.signal });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setInstitutes(data.institutes || []);
        } catch (error) {
            console.error("Failed to fetch institutes:", error);
            toast.error("Failed to load institutes");
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async (institute) => {
        const isSuspended = institute.status === 'suspended';
        const newStatus = isSuspended ? 'active' : 'suspended';
        
        confirm({
            title: isSuspended ? 'Restore Access' : 'Restrict Access',
            content: isSuspended 
                ? 'Are you sure you want to reactivate this organization? All institutional services will be restored immediately.' 
                : "Suspension will immediately terminate all access for this institute's staff and students. Continue?",
            okText: isSuspended ? 'Reactivate' : 'Deactivate Now',
            okType: isSuspended ? 'primary' : 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const res = await fetch(`/api/v1/institutes/${institute._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: newStatus }),
                    });

                    if (!res.ok) throw new Error("Failed to update status");

                    setInstitutes(prev => prev.map(inst =>
                        inst._id === institute._id ? { ...inst, status: newStatus } : inst
                    ));
                    toast.success(`Institute ${newStatus === 'active' ? 'Activated' : 'Suspended'}`);
                } catch (error) {
                    toast.error(error.message);
                }
            }
        });
    };

    const handleDelete = (institute) => {
        confirm({
            title: 'Permanent Removal',
            content: 'This will initiate a soft-delete protocol. The institute will be removed from directory but encrypted records will persist for legal compliance.',
            okText: 'Confirm Deletion',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const res = await fetch(`/api/v1/institutes/${institute._id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Failed to delete institute");
                    
                    setInstitutes(prev => prev.filter(inst => inst._id !== institute._id));
                    toast.success("Institute Deleted Successfully");
                } catch (error) {
                    toast.error(error.message);
                }
            }
        });
    };

    const filteredInstitutes = institutes.filter(inst =>
        inst.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        inst.code?.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Organization Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
            render: (text, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{text || 'N/A'}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.contactEmail || 'N/A'}</Text>
                </Space>
            )
        },
        {
            title: 'Auth Code',
            dataIndex: 'code',
            key: 'code',
            render: (code) => <Tag color="default">{code || '----'}</Tag>
        },
        {
            title: 'Security Status',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: 'Active', value: 'active' },
                { text: 'Suspended', value: 'suspended' },
            ],
            onFilter: (value, record) => record.status === value,
            render: (status) => (
                <Badge 
                    status={status === 'active' ? 'success' : 'error'} 
                    text={<span style={{ textTransform: 'capitalize' }}>{status}</span>} 
                />
            )
        },
        {
            title: 'Service Plan',
            key: 'plan',
            render: (_, record) => (
                <Text style={{ textTransform: 'uppercase', fontSize: '12px' }} strong>
                    {record.subscription?.plan || 'Standard'}
                </Text>
            )
        },
        {
            title: 'Population',
            key: 'population',
            sorter: (a, b) => (a.usage?.studentCount || 0) - (b.usage?.studentCount || 0),
            render: (_, record) => record.usage?.studentCount || 0
        },
        {
            title: 'Operations',
            key: 'operations',
            align: 'right',
            render: (_, record) => {
                const isSuspended = record.status === 'suspended';
                return (
                    <Space size="small">
                        <Tooltip title="Edit">
                            <Button 
                                type="text" 
                                icon={<EditOutlined />} 
                                onClick={() => router.push(`/super-admin/institutes/${record._id}/edit`)} 
                            />
                        </Tooltip>
                        <Tooltip title={isSuspended ? "Activate" : "Suspend"}>
                            <Button 
                                type="text" 
                                danger={!isSuspended}
                                style={{ color: isSuspended ? '#52c41a' : undefined }}
                                icon={isSuspended ? <CheckCircleOutlined /> : <StopOutlined />} 
                                onClick={() => handleSuspend(record)} 
                            />
                        </Tooltip>
                        <Tooltip title="Delete">
                            <Button 
                                type="text" 
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={() => handleDelete(record)} 
                            />
                        </Tooltip>
                    </Space>
                );
            }
        }
    ];

    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <Title level={2} style={{ marginBottom: 4 }}>Institutes</Title>
                    <Text type="secondary">Manage and audit institutional partners.</Text>
                </div>
                <Space size="middle">
                    <Input 
                        placeholder="Find an institute..." 
                        prefix={<SearchOutlined />} 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                    <Link href="/super-admin/institutes/create">
                        <Button type="primary" icon={<PlusOutlined />} size="large">
                            Register
                        </Button>
                    </Link>
                </Space>
            </div>

            <Card>
                <Table 
                    columns={columns} 
                    dataSource={filteredInstitutes} 
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </Space>
    );
}
