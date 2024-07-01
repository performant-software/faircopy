export function isAdmin(permissions) {
    return permissions.includes('FCC_Admin') || permissions.includes('FCC_TeamAdmin')
}

export function canConfigAdmin(permissions) {
    if( isAdmin(permissions) ) return true
    if( permissions.includes('FCC_CanManageConfigs')) return true
    return false
}

export function canCheckOut(permissions) {
    if( isAdmin(permissions) ) return true
    if( permissions.includes('FCC_CanCheckoutResources')) return true
    return false
}

export function canCreate(permissions) {
    if( isAdmin(permissions) ) return true
    if( permissions.includes('FCC_CanCreateResources')) return true
    return false
}

export function canDelete(permissions) {
    if( isAdmin(permissions) ) return true
    if( permissions.includes('FCC_CanDeleteResources')) return true
    return false
}