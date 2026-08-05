"use client";

import { 
    Typography, 
    Button, 
    Card, 
    Row, 
    Col, 
    Space, 
    Badge
} from "antd";
import { 
    SettingOutlined, 
    SafetyOutlined,
    BellOutlined, 
    LockOutlined, 
    GlobalOutlined, 
    ThunderboltOutlined,
    SaveOutlined,
    UndoOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

export default function SuperAdminSettings() {
    return (
        <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 16 }}>
                <SettingOutlined style={{ fontSize: '32px', color: '#1677ff' }} />
                <div>
                    <Title level={2} style={{ marginBottom: 0 }}>Global Settings</Title>
                    <Text type="secondary">Configure platform-wide parameters and security protocols.</Text>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                    <SettingsCard
                        icon={<SafetyOutlined />}
                        title="Security & Governance"
                        description="Manage authentication protocols, session timeouts, and IP white-listing."
                        status="Operational"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <SettingsCard
                        icon={<BellOutlined />}
                        title="System Notifications"
                        description="Configure global SMTP settings and system-wide broadcast messages."
                        status="Configured"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <SettingsCard
                        icon={<GlobalOutlined />}
                        title="Region & Localization"
                        description="Set default timezones, currency, and multi-language support parameters."
                        status="Active"
                    />
                </Col>
                <Col xs={24} md={12}>
                    <SettingsCard
                        icon={<LockOutlined />}
                        title="Audit Logs"
                        description="Retention policies for system-wide activity logs and security events."
                        status="Logging"
                    />
                </Col>
            </Row>

            <Card 
                style={{ 
                    marginTop: 24, 
                    backgroundColor: '#001529', 
                    borderColor: '#001529',
                    textAlign: 'center',
                    padding: '24px 0'
                }}
            >
                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <div style={{ 
                        width: 64, 
                        height: 64, 
                        backgroundColor: '#1677ff', 
                        borderRadius: 16, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto'
                    }}>
                        <ThunderboltOutlined style={{ fontSize: 32, color: 'white' }} />
                    </div>
                    
                    <div>
                        <Title level={3} style={{ color: 'white', margin: 0 }}>Advanced Controls</Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.65)', maxWidth: 500, margin: '8px auto 0' }}>
                            These settings directly impact the platform's core infrastructure. Changes may require a system restart.
                        </Paragraph>
                    </div>

                    <Space size="middle" style={{ marginTop: 16 }}>
                        <Button type="default" size="large" icon={<SaveOutlined />}>
                            Save Changes
                        </Button>
                        <Button type="primary" danger size="large" icon={<UndoOutlined />}>
                            Rollback Configuration
                        </Button>
                    </Space>
                </Space>
            </Card>
        </Space>
    );
}

function SettingsCard({ icon, title, description, status }) {
    return (
        <Card className="settings-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div className="icon-wrapper" style={{ fontSize: 24, color: '#8c8c8c' }}>
                    {icon}
                </div>
                <Badge 
                    status="success" 
                    text={status} 
                    style={{ 
                        backgroundColor: '#f6ffed', 
                        border: '1px solid #b7eb8f', 
                        padding: '2px 8px', 
                        borderRadius: 12,
                        fontSize: 12,
                        color: '#52c41a'
                    }} 
                />
            </div>
            <Title level={4} style={{ marginBottom: 8 }}>{title}</Title>
            <Text type="secondary">{description}</Text>

            <style jsx global>{`
                .settings-card:hover .icon-wrapper {
                    color: #1677ff !important;
                }
            `}</style>
        </Card>
    );
}
