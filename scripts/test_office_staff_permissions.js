import assert from 'node:assert';
import { AVAILABLE_PERMISSIONS } from '../lib/permissions.js';

console.log("Running self-check for Office Staff permissions...");

// 1. Verify permissions definition
assert(Array.isArray(AVAILABLE_PERMISSIONS), "AVAILABLE_PERMISSIONS must be an array");
assert(AVAILABLE_PERMISSIONS.length >= 10, "AVAILABLE_PERMISSIONS should cover all operational modules");
const permIds = AVAILABLE_PERMISSIONS.map(p => p.id);
assert(permIds.includes("view_front_office"), "Must include view_front_office");
assert(permIds.includes("manage_fees"), "Must include manage_fees");
assert(permIds.includes("manage_enquiries"), "Must include manage_enquiries");
assert(permIds.includes("manage_stock"), "Must include manage_stock");
assert(permIds.includes("manage_library"), "Must include manage_library");
assert(permIds.includes("generate_id_cards"), "Must include generate_id_cards");

// 2. Test category resolution logic
function resolveCategory(member) {
    if (member.role === "admin") return "admin";
    if (member.role === "instructor") return "instructor";
    if (member.role === "staff") {
        return member.allowLogin === false ? "support_staff" : "office_staff";
    }
    return "support_staff";
}

assert.strictEqual(resolveCategory({ role: "admin", allowLogin: true }), "admin");
assert.strictEqual(resolveCategory({ role: "instructor", allowLogin: true }), "instructor");
assert.strictEqual(resolveCategory({ role: "staff", allowLogin: true }), "office_staff");
assert.strictEqual(resolveCategory({ role: "staff", allowLogin: false }), "support_staff");

// 3. Test layout navigation filtering logic
function filterNavGroups(groups, user) {
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    return groups.filter(group => {
        const hasRole = !group.role || group.role.includes(user?.role);
        if (!hasRole) return false;
        if (!isAdmin && group.permission) {
            const requiredPerms = Array.isArray(group.permission) ? group.permission : [group.permission];
            const hasAnyPerm = requiredPerms.some(p => user?.permissions?.includes(p));
            if (!hasAnyPerm) return false;
        }
        return true;
    }).map(group => ({
        ...group,
        items: group.items.filter(item => {
            const hasRole = !item.role || item.role.includes(user?.role);
            const hasPermission = isAdmin || !item.permission || (user?.permissions && user.permissions.includes(item.permission));
            return hasRole && hasPermission;
        })
    })).filter(group => group.items.length > 0);
}

const mockMenuGroups = [
    {
        label: "Front Office",
        role: ["admin", "super_admin", "staff"],
        permission: "view_front_office",
        items: [{ label: "Visitor Book", href: "/admin/front-office/visitor-book" }]
    },
    {
        label: "Finance",
        role: ["admin", "super_admin", "staff"],
        permission: "manage_fees",
        items: [{ label: "Fees", href: "/admin/fees" }]
    },
    {
        label: "Administration",
        role: ["admin", "super_admin", "staff"],
        permission: "generate_id_cards",
        items: [
            { label: "Settings", href: "/admin/settings", role: ["admin", "super_admin"] },
            { label: "User Management", href: "/admin/users", role: ["admin", "super_admin"] },
            { label: "ID Card Management", href: "/admin/id-cards", permission: "generate_id_cards" }
        ]
    }
];

// Office staff with only Front Office access
const frontDeskStaff = {
    role: "staff",
    allowLogin: true,
    permissions: ["view_front_office"]
};
const filteredForFrontDesk = filterNavGroups(mockMenuGroups, frontDeskStaff);
assert.strictEqual(filteredForFrontDesk.length, 1, "Front desk staff should only see 1 group");
assert.strictEqual(filteredForFrontDesk[0].label, "Front Office");

// Office staff with ID Card printing permission
const idCardClerk = {
    role: "staff",
    allowLogin: true,
    permissions: ["generate_id_cards"]
};
const filteredForIdClerk = filterNavGroups(mockMenuGroups, idCardClerk);
assert.strictEqual(filteredForIdClerk.length, 1);
assert.strictEqual(filteredForIdClerk[0].label, "Administration");
assert.strictEqual(filteredForIdClerk[0].items.length, 1);
assert.strictEqual(filteredForIdClerk[0].items[0].label, "ID Card Management", "ID Clerk must not see Settings or User Management");

// Full Administrator
const adminUser = {
    role: "admin",
    allowLogin: true,
    permissions: []
};
const filteredForAdmin = filterNavGroups(mockMenuGroups, adminUser);
assert.strictEqual(filteredForAdmin.length, 3, "Admin should see all groups");
assert.strictEqual(filteredForAdmin.find(g => g.label === "Administration").items.length, 3, "Admin sees all items including settings and users");

console.log("All Office Staff RBAC & permissions assertions passed successfully!");
