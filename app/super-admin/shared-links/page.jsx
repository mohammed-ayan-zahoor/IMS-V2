"use client";

import { useState, useEffect } from "react";
import { 
    Card, 
    Typography, 
    Button, 
    Input, 
    Space, 
    Table,
    Badge, 
    Modal, 
    Select,
    Tooltip,
    Row,
    Col,
    Tag,
    Statistic
} from "antd";
import { 
    CopyOutlined,
    DeleteOutlined,
    GlobalOutlined,
    PoweroffOutlined,
    BankOutlined,
    TeamOutlined,
    MessageOutlined,
    LinkOutlined,
    PlusOutlined
} from "@ant-design/icons";
import { useToast } from "@/contexts/ToastContext";

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;
const { Option } = Select;

export default function SharedLinksPage() {
    const toast = useToast();
    const [links, setLinks] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form State
    const [newLinkName, setNewLinkName] = useState("");
    const [selectedInstitutes, setSelectedInstitutes] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [linksRes, instRes] = await Promise.all([
                    fetch("/api/v1/shared-links"),
                    fetch("/api/v1/institutes")
                ]);

                if (!linksRes.ok || !instRes.ok) {
                    throw new Error("Failed to fetch data");
                }

                const linksData = await linksRes.json();
                const instData = await instRes.json();

                setLinks(linksData.links || []);
                setInstitutes(instData.institutes || []);
            } catch (error) {
                console.error("Fetch error:", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const handleCreateLink = async () => {
        if (!newLinkName || selectedInstitutes.length === 0) {
            toast.error("Please provide a name and select at least one institute");
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/v1/shared-links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newLinkName,
                    institutes: selectedInstitutes
                })
            });

            if (!res.ok) throw new Error("Failed to generate link");

            const data = await res.json();
            setLinks([data.link, ...links]);
            setNewLinkName("");
            setSelectedInstitutes([]);
            toast.success("Shared dashboard generated!");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setCreating(false);
        }
    };

    const toggleStatus = async (link) => {
        try {
            const res = await fetch(`/api/v1/shared-links/${link._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !link.isActive })
            });

            if (!res.ok) throw new Error("Update failed");

            setLinks(links.map(l => l._id === link._id ? { ...l, isActive: !l.isActive } : l));
            toast.success(`Dashboard ${!link.isActive ? 'Activated' : 'Disabled'}`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = (id) => {
        confirm({
            title: 'Delete Shared Link',
            content: 'Are you sure you want to delete this shared dashboard link?',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const res = await fetch(`/api/v1/shared-links/${id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Delete failed");
                    setLinks(links.filter(l => l._id !== id));
                    toast.success("Link deleted");
                } catch (error) {
                    toast.error(error.message);
                }
            }
        });
    };

    const copyToClipboard = async (slug) => {
        const url = `${window.location.origin}/public/dashboard/${slug}`;
        
        if (!navigator.clipboard) {
            toast.error("Clipboard access not available");
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
        } catch (err) {
            console.error("Copy failed:", err);
            toast.error("Failed to copy link");
        }
    };

    const columns = [
        {
            title: 'Dashboard Details',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text, record) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Paragraph copyable={{ text: `${window.location.origin}/public/dashboard/${record.slug}` }} style={{ marginBottom: 0, fontSize: '12px' }} type="secondary">
                        /public/dashboard/{record.slug}
                    </Paragraph>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            filters: [
                { text: 'Active', value: true },
                { text: 'Terminated', value: false },
            ],
            onFilter: (value, record) => record.isActive === value,
            render: (isActive) => (
                <Badge 
                    status={isActive ? 'success' : 'error'} 
                    text={isActive ? 'Active' : 'Terminated'} 
                />
            )
        },
        {
            title: 'Statistics',
            key: 'stats',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Institutes">
                        <Space size={4}><BankOutlined style={{ color: '#888' }} /> {record.institutes?.length || 0}</Space>
                    </Tooltip>
                    <Tooltip title="Visits">
                        <Space size={4}><TeamOutlined style={{ color: '#888' }} /> {record.visitors?.length || 0}</Space>
                    </Tooltip>
                    <Tooltip title="Comments">
                        <Space size={4}><MessageOutlined style={{ color: '#888' }} /> {record.comments?.length || 0}</Space>
                    </Tooltip>
                </Space>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Copy Link">
                        <Button 
                            type="text" 
                            icon={<CopyOutlined />} 
                            onClick={() => copyToClipboard(record.slug)} 
                        />
                    </Tooltip>
                    <Tooltip title="Visit Link">
                        <a href={`/public/dashboard/${record.slug}`} target="_blank" rel="noopener noreferrer">
                            <Button type="text" icon={<GlobalOutlined />} />
                        </a>
                    </Tooltip>
                    <Tooltip title={record.isActive ? "Disable" : "Activate"}>
                        <Button 
                            type="text" 
                            danger={record.isActive}
                            style={{ color: !record.isActive ? '#52c41a' : undefined }}
                            icon={<PoweroffOutlined />} 
                            onClick={() => toggleStatus(record)} 
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleDelete(record._id)} 
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
            <div>
                <Title level={2} style={{ marginBottom: 4 }}>Shared Access</Title>
                <Text type="secondary">Generate unique endpoints for multi-institutional fee auditing.</Text>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={8}>
                    <Card title={<><LinkOutlined style={{ color: '#1677ff', marginRight: 8 }} />New Generator</>}>
                        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Dashboard Name</Text>
                                <Input 
                                    placeholder="e.g. Q1 RECOVERY DRIVE" 
                                    value={newLinkName}
                                    onChange={(e) => setNewLinkName(e.target.value)}
                                    size="large"
                                />
                            </div>
                            
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Institutes</Text>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    style={{ width: '100%' }}
                                    placeholder="Please select institutes"
                                    value={selectedInstitutes}
                                    onChange={setSelectedInstitutes}
                                    size="large"
                                    optionLabelProp="label"
                                >
                                    {institutes.map(inst => (
                                        <Option key={inst._id} value={inst._id} label={inst.name}>
                                            <Space>
                                                <BankOutlined />
                                                {inst.name}
                                            </Space>
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <Button 
                                type="primary" 
                                size="large" 
                                block 
                                icon={<PlusOutlined />}
                                loading={creating}
                                onClick={handleCreateLink}
                                disabled={!newLinkName || selectedInstitutes.length === 0}
                                style={{ marginTop: 8 }}
                            >
                                Generate Link
                            </Button>
                        </Space>
                    </Card>
                </Col>
                
                <Col xs={24} lg={16}>
                    <Card 
                        title="Active Endpoints" 
                        extra={<Tag color="blue">{links.length} TOTAL</Tag>}
                        styles={{ body: { padding: 0 } }}
                    >
                        <Table 
                            columns={columns} 
                            dataSource={links} 
                            rowKey="_id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            rowClassName={(record) => !record.isActive ? 'disabled-row' : ''}
                        />
                    </Card>
                </Col>
            </Row>

            <style jsx global>{`
                .disabled-row {
                    opacity: 0.5;
                }
            `}</style>
        </Space>
    );
}
