"use client";

import { useState, useEffect } from "react";
import { 
    Typography, 
    Button, 
    Input, 
    Table, 
    Badge, 
    Modal, 
    Form, 
    Select, 
    Space, 
    Avatar,
    Card,
    List,
    Row,
    Col,
    Tooltip
} from "antd";
import { 
    SearchOutlined, 
    UserAddOutlined,
    SafetyOutlined,
    BankOutlined,
    DeleteOutlined,
    SettingOutlined,
    PlusCircleOutlined
} from "@ant-design/icons";
import { useToast } from "@/contexts/ToastContext";

const { Title, Text } = Typography;
const { Option } = Select;

export default function AdminManagementPage() {
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    
    // Modal states
    const [selectedUser, setSelectedUser] = useState(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [memberships, setMemberships] = useState([]);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, iRes] = await Promise.all([
                fetch("/api/v1/users?role=admin"),
                fetch("/api/v1/institutes")
            ]);

            if (!uRes.ok || !iRes.ok) {
                throw new Error("Failed to Fetch data");
            }

            const uData = await uRes.json();
            const iData = await iRes.json();

            setUsers(uData.users || []);
            setInstitutes(iData.institutes || []);
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberships = async (userId) => {
        try {
            const res = await fetch(`/api/v1/users/${userId}/memberships`);
            if (!res.ok) throw new Error("Failed to load memberships");
            const data = await res.json();
            setMemberships(data.memberships || []);
        } catch (error) {
            toast.error("Failed to load memberships");
        }
    };

    const handleManageAccess = (user) => {
        setSelectedUser(user);
        fetchMemberships(user._id);
        setIsManageModalOpen(true);
    };

    const handleAddMembership = async (instituteId) => {
        try {
            const res = await fetch(`/api/v1/users/${selectedUser._id}/memberships`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instituteId, role: 'admin' })
            });
            if (!res.ok) throw new Error("Failed to add access");
            fetchMemberships(selectedUser._id);
            toast.success("Access granted");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRemoveMembership = async (instituteId) => {
        try {
            const res = await fetch(`/api/v1/users/${selectedUser._id}/memberships?instituteId=${instituteId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Failed to revoke access");
            setMemberships(prev => prev.filter(m => m.institute?._id !== instituteId));
            toast.success("Access revoked");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleCreateUser = async (values) => {
        setCreating(true);
        try {
            const payload = {
                ...values,
                role: "admin"
            };
            
            const res = await fetch("/api/v1/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Administrator registered successfully");
                setIsCreateModalOpen(false);
                form.resetFields();
                fetchData();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to register admin");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setCreating(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchText.toLowerCase()) ||
        `${u.profile?.firstName} ${u.profile?.lastName}`.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Administrator',
            key: 'admin',
            sorter: (a, b) => (a.profile?.firstName || '').localeCompare(b.profile?.firstName || ''),
            render: (_, record) => (
                <Space>
                    <Avatar style={{ backgroundColor: '#1677ff' }}>
                        {record.profile?.firstName?.[0]}{record.profile?.lastName?.[0]}
                    </Avatar>
                    <Space orientation="vertical" size={0}>
                        <Text strong>{record.profile?.firstName} {record.profile?.lastName}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Primary Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Badge 
                    count={<Space size={4} style={{ color: '#595959', fontSize: '12px' }}><SafetyOutlined /> {role}</Space>}
                    style={{ backgroundColor: '#f5f5f5', border: '1px solid #d9d9d9', color: '#595959', padding: '0 8px', textTransform: 'capitalize' }} 
                />
            )
        },
        {
            title: 'Account Status',
            dataIndex: 'isActive',
            key: 'isActive',
            filters: [
                { text: 'Active', value: true },
                { text: 'Inactive', value: false },
            ],
            onFilter: (value, record) => record.isActive === value,
            render: (isActive) => (
                <Badge 
                    status={isActive ? 'success' : 'default'} 
                    text={isActive ? 'Active' : 'Inactive'} 
                />
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Button 
                    type="default" 
                    icon={<SettingOutlined />} 
                    onClick={() => handleManageAccess(record)}
                >
                    Manage Access
                </Button>
            )
        }
    ];

    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <Title level={2} style={{ marginBottom: 4 }}>Admin Management</Title>
                    <Text type="secondary">Manage global administrators and their institute access.</Text>
                </div>
                <Space size="middle">
                    <Input 
                        placeholder="Search admins..." 
                        prefix={<SearchOutlined />} 
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 300 }}
                        allowClear
                    />
                    <Button type="primary" icon={<UserAddOutlined />} size="large" onClick={() => setIsCreateModalOpen(true)}>
                        Register Admin
                    </Button>
                </Space>
            </div>

            <Card styles={{ body: { padding: 0 } }}>
                <Table 
                    columns={columns} 
                    dataSource={filteredUsers} 
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            {/* Manage Access Modal */}
            <Modal
                title={`Manage Access - ${selectedUser?.email}`}
                open={isManageModalOpen}
                onCancel={() => setIsManageModalOpen(false)}
                footer={null}
                width={800}
            >
                <Row gutter={24} style={{ marginTop: 16 }}>
                    <Col xs={24} md={12}>
                        <Title level={5}>Authorized Institutes</Title>
                        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
                            {memberships.filter(m => m.institute).length === 0 ? (
                                <div style={{ padding: 16, textAlign: 'center', color: '#00000040' }}>No specific institute access granted.</div>
                            ) : memberships.filter(m => m.institute).map((m, index) => (
                                <div key={m.institute._id || index} className="hover-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                    <Space>
                                        <Avatar icon={<BankOutlined />} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <Text>{m.institute.name}</Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>{m.institute.code}</Text>
                                        </div>
                                    </Space>
                                    <Tooltip title="Revoke Access">
                                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveMembership(m.institute._id)} />
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </Col>
                    
                    <Col xs={24} md={12}>
                        <Title level={5}>Grant New Access</Title>
                        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
                            {institutes.filter(inst => !memberships.some(m => m.institute?._id === inst._id)).length === 0 ? (
                                <div style={{ padding: 16, textAlign: 'center', color: '#00000040' }}>No available institutes to grant.</div>
                            ) : institutes.filter(inst => !memberships.some(m => m.institute?._id === inst._id)).map((inst, index) => (
                                <div key={inst._id || index} className="hover-list-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <Text>{inst.name}</Text>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>{inst.code}</Text>
                                    </div>
                                    <Button type="primary" size="small" icon={<PlusCircleOutlined />} onClick={() => handleAddMembership(inst._id)}>
                                        Add
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Col>
                </Row>
            </Modal>

            {/* Create Admin Modal */}
            <Modal
                title="Register New Admin"
                open={isCreateModalOpen}
                onCancel={() => {
                    setIsCreateModalOpen(false);
                    form.resetFields();
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateUser}
                    style={{ marginTop: 16 }}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="First Name" name="firstName" rules={[{ required: true }]}>
                                <Input placeholder="John" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Last Name" name="lastName" rules={[{ required: true }]}>
                                <Input placeholder="Doe" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="admin@example.com" />
                    </Form.Item>
                    
                    <Form.Item label="Assign Primary Institute" name="instituteId" rules={[{ required: true }]}>
                        <Select placeholder="Select an institute...">
                            {institutes.map(inst => (
                                <Option key={inst._id} value={inst._id}>
                                    {inst.name} ({inst.code})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item label="Password" name="password" rules={[{ required: true, min: 8 }]}>
                        <Input.Password placeholder="••••••••" />
                    </Form.Item>
                    
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => {
                                setIsCreateModalOpen(false);
                                form.resetFields();
                            }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" loading={creating}>
                                Register Now
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
