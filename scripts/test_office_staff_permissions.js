import assert from 'node:assert';
import { PERMISSION_CATEGORIES, ALL_PERMISSIONS, hasUserPermission } from '../lib/permissions.js';

console.log("Running self-check for Granular RBAC & Sub-Module Permissions...");

// 1. Verify structured categories and granular permissions registry
assert(Array.isArray(PERMISSION_CATEGORIES), "PERMISSION_CATEGORIES must be an array");
assert(PERMISSION_CATEGORIES.length >= 8, "Must have structured categories (Front office, Finance, HR, etc.)");
assert(Array.isArray(ALL_PERMISSIONS), "ALL_PERMISSIONS must be an array");
assert(ALL_PERMISSIONS.length >= 35, `ALL_PERMISSIONS should cover all granular sub-modules, got ${ALL_PERMISSIONS.length}`);

const permIds = ALL_PERMISSIONS.map(p => p.id);
assert(permIds.includes("front_office_visitor_book"), "Must include front_office_visitor_book");
assert(permIds.includes("front_office_calls"), "Must include front_office_calls");
assert(permIds.includes("finance_fees"), "Must include finance_fees");
assert(permIds.includes("finance_collections"), "Must include finance_collections");
assert(permIds.includes("academic_students"), "Must include academic_students");
assert(permIds.includes("learning_exams"), "Must include learning_exams");
assert(permIds.includes("admin_id_cards"), "Must include admin_id_cards");

// 2. Test hasUserPermission backward compatibility and granular checks
// A: Direct match
assert.strictEqual(hasUserPermission(["front_office_visitor_book"], "front_office_visitor_book"), true);
assert.strictEqual(hasUserPermission(["front_office_visitor_book"], "front_office_calls"), false);

// B: Legacy backward compatibility
// User with legacy 'view_front_office' should be granted both visitor book and phone calls
assert.strictEqual(hasUserPermission(["view_front_office"], "front_office_visitor_book"), true);
assert.strictEqual(hasUserPermission(["view_front_office"], "front_office_calls"), true);
assert.strictEqual(hasUserPermission(["view_front_office"], "finance_fees"), false);

// User with legacy 'manage_fees' should be granted fee collection and collections history
assert.strictEqual(hasUserPermission(["manage_fees"], "finance_fees"), true);
assert.strictEqual(hasUserPermission(["manage_fees"], "finance_collections"), true);
assert.strictEqual(hasUserPermission(["manage_fees"], "admin_id_cards"), false);

// 3. Test category resolution logic
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

// 4. Test layout navigation filtering with granular hasUserPermission
function filterNavGroups(groups, user) {
    const isAdmin = ['admin', 'super_admin'].includes(user?.role);
    return groups.filter(group => {
        const hasRole = !group.role || group.role.includes(user?.role);
        if (!hasRole) return false;
        if (!isAdmin && group.permission) {
            const requiredPerms = Array.isArray(group.permission) ? group.permission : [group.permission];
            const hasAnyPerm = requiredPerms.some(p => hasUserPermission(user?.permissions, p));
            if (!hasAnyPerm) return false;
        }
        return true;
    }).map(group => ({
        ...group,
        items: group.items.filter(item => {
            const hasRole = !item.role || item.role.includes(user?.role);
            const hasPermission = isAdmin || !item.permission || hasUserPermission(user?.permissions, item.permission);
            return hasRole && hasPermission;
        })
    })).filter(group => group.items.length > 0);
}

const mockMenuGroups = [
    {
        label: "Front Office",
        role: ["admin", "super_admin", "staff"],
        permission: ["front_office_visitor_book", "front_office_calls"],
        items: [
            { label: "Visitor Book", href: "/admin/front-office/visitor-book", permission: "front_office_visitor_book" },
            { label: "Phone Calls", href: "/admin/front-office/calls", permission: "front_office_calls" }
        ]
    },
    {
        label: "Finance",
        role: ["admin", "super_admin", "staff"],
        permission: ["finance_fees", "finance_collections"],
        items: [
            { label: "Fees", href: "/admin/fees", permission: "finance_fees" }
        ]
    },
    {
        label: "Administration",
        role: ["admin", "super_admin", "staff"],
        permission: ["admin_id_cards"],
        items: [
            { label: "Settings", href: "/admin/settings", role: ["admin", "super_admin"] },
            { label: "User Management", href: "/admin/users", role: ["admin", "super_admin"] },
            { label: "ID Card Management", href: "/admin/id-cards", permission: "admin_id_cards" }
        ]
    }
];

// Office staff with only Front Office Visitor Book access (granular)
const visitorOnlyStaff = {
    role: "staff",
    allowLogin: true,
    permissions: ["front_office_visitor_book"]
};
const filteredForVisitor = filterNavGroups(mockMenuGroups, visitorOnlyStaff);
assert.strictEqual(filteredForVisitor.length, 1, "Visitor staff should only see Front Office");
assert.strictEqual(filteredForVisitor[0].label, "Front Office");
assert.strictEqual(filteredForVisitor[0].items.length, 1);
assert.strictEqual(filteredForVisitor[0].items[0].label, "Visitor Book", "Should only see Visitor Book, not Phone Calls");

// Legacy user with 'view_front_office'
const legacyFrontDesk = {
    role: "staff",
    allowLogin: true,
    permissions: ["view_front_office"]
};
const filteredForLegacy = filterNavGroups(mockMenuGroups, legacyFrontDesk);
assert.strictEqual(filteredForLegacy.length, 1);
assert.strictEqual(filteredForLegacy[0].items.length, 2, "Legacy view_front_office should access both Visitor Book & Phone Calls");

// Full Administrator
const adminUser = {
    role: "admin",
    allowLogin: true,
    permissions: []
};
const filteredForAdmin = filterNavGroups(mockMenuGroups, adminUser);
assert.strictEqual(filteredForAdmin.length, 3, "Admin should see all groups");
assert.strictEqual(filteredForAdmin.find(g => g.label === "Administration").items.length, 3, "Admin sees all items including settings and users");

console.log("All Granular Sub-Module Permissions assertions passed successfully!");
