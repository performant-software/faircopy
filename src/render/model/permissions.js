export function isAdmin(permissions) {
    return permissions.includes('FCC_OrgAdmin') || permissions.includes('FCC_SystemAdmin') || permissions.includes('FCC_ProjectAdmin')
}

export function canConfigAdmin(permissions) {
    if (isAdmin(permissions)) return true
    return false
}

export function canCheckOut(permissions) {
    if (isAdmin(permissions)) return true
    if (permissions.includes('FCC_ProjectContributor') || permissions.includes('FCC_ProjectMember')) return true
    return false
}

export function canCreate(permissions) {
    if (isAdmin(permissions)) return true
    if (permissions.includes('FCC_ProjectMember')) return true
    return false
}

export function canDelete(permissions) {
    if (isAdmin(permissions)) return true
    if (permissions.includes('FCC_ProjectMember')) return true
    return false
}

export function canAbandonOtherUsersResources(permissions) {
    if (isAdmin(permissions)) return true
    return false
}

export function canAbandonOwnResource(permissions, resource, userID) {
    // allow the user to abandon if they have checkout permissions and they are the one who checked out the resource
    if (canCheckOut(permissions) && resource?.lastAction?.action_type === 'check_out' && resource.lastAction.user?.id === userID) {
        return true
    }
    return false
}
