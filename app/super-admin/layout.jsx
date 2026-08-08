"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout, Menu, ConfigProvider, theme, Avatar, Dropdown, Space, Spin, Switch } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import {
    DashboardOutlined,
    BankOutlined,
    TeamOutlined,
    SettingOutlined,
    LinkOutlined,
    LogoutOutlined,
    GlobalOutlined,
    UserOutlined,
    BulbOutlined,
    TagOutlined
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

export default function SuperAdminLayout({ children }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role !== "super_admin") {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
                <Spin size="large" description="Authenticating..." />
            </div>
        );
    }

    if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "super_admin")) {
        return null;
    }

    const menuItems = [
        {
            key: "/super-admin",
            icon: <DashboardOutlined />,
            label: <Link href="/super-admin">Dashboard</Link>,
        },
        {
            key: "/super-admin/institutes",
            icon: <BankOutlined />,
            label: <Link href="/super-admin/institutes">Institutes</Link>,
        },
        {
            key: "/super-admin/coupons",
            icon: <TagOutlined />,
            label: <Link href="/super-admin/coupons">MOU Coupons</Link>,
        },
        {
            key: "/super-admin/users",
            icon: <TeamOutlined />,
            label: <Link href="/super-admin/users">Admin Management</Link>,
        },
        {
            key: "/super-admin/shared-links",
            icon: <LinkOutlined />,
            label: <Link href="/super-admin/shared-links">Shared Dashboards</Link>,
        },
        {
            key: "/super-admin/settings",
            icon: <SettingOutlined />,
            label: <Link href="/super-admin/settings">Global Settings</Link>,
        }
    ];

    const getSelectedKey = () => {
        if (pathname.startsWith("/super-admin/institutes")) return "/super-admin/institutes";
        if (pathname.startsWith("/super-admin/coupons")) return "/super-admin/coupons";
        if (pathname.startsWith("/super-admin/users")) return "/super-admin/users";
        if (pathname.startsWith("/super-admin/shared-links")) return "/super-admin/shared-links";
        if (pathname.startsWith("/super-admin/settings")) return "/super-admin/settings";
        return "/super-admin";
    };

    const userMenu = {
        items: [
            {
                key: '1',
                label: (
                    <div style={{ padding: '4px 0' }}>
                        <div style={{ fontWeight: 'bold' }}>{session?.user?.name || 'System Admin'}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>Super Admin</div>
                    </div>
                ),
                disabled: true,
            },
            {
                type: 'divider',
            },
            {
                key: '2',
                icon: <LogoutOutlined />,
                label: 'Sign Out',
                onClick: async () => {
                    await signOut({ redirect: false });
                    window.location.href = "/login";
                }
            }
        ]
    };

    return (
        <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <AntdRegistry>
                <Layout style={{ minHeight: '100vh' }}>
                    <Sider 
                        collapsible 
                        collapsed={collapsed} 
                        onCollapse={(value) => setCollapsed(value)}
                        theme={isDarkMode ? "dark" : "light"}
                        style={{ borderRight: isDarkMode ? 'none' : '1px solid #f0f0f0' }}
                    >
                        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0', overflow: 'hidden' }}>
                            {collapsed ? (
                                <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1677ff' }}>QA</div>
                            ) : (
                                <div style={{ fontWeight: 'bold', fontSize: '18px', whiteSpace: 'nowrap', color: isDarkMode ? '#fff' : '#000' }}>
                                    Quantech <span style={{ color: '#1677ff' }}>Admin</span>
                                </div>
                            )}
                        </div>
                        <Menu 
                            theme={isDarkMode ? "dark" : "light"} 
                            mode="inline" 
                            selectedKeys={[getSelectedKey()]} 
                            items={menuItems} 
                            style={{ borderRight: 0, marginTop: '16px' }}
                        />
                    </Sider>
                    <Layout>
                        <Header style={{ padding: '0 24px', background: isDarkMode ? '#141414' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: isDarkMode ? '#fff' : '#000' }}>
                                    <div style={{ width: '4px', height: '16px', backgroundColor: '#1677ff', borderRadius: '4px' }}></div>
                                    PLATFORM MANAGER
                                </div>

                            </div>
                            <Space size="large">
                                <Switch 
                                    checkedChildren="Dark" 
                                    unCheckedChildren="Light" 
                                    checked={isDarkMode} 
                                    onChange={(checked) => setIsDarkMode(checked)} 
                                />
                                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#595959', textDecoration: 'none' }}>
                                    <GlobalOutlined /> Preview Site
                                </Link>
                                <Dropdown menu={userMenu} placement="bottomRight" arrow>
                                    <Avatar style={{ backgroundColor: '#1677ff', cursor: 'pointer' }}>
                                        {session?.user?.name?.[0] || <UserOutlined />}
                                    </Avatar>
                                </Dropdown>
                            </Space>
                        </Header>
                        <Content style={{ margin: '24px', minHeight: 280 }}>
                            {children}
                        </Content>
                    </Layout>
                </Layout>
            </AntdRegistry>
        </ConfigProvider>
    );
}
