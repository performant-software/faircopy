import React from 'react'

// create an inline spinner (uses Pure CSS Loaders: https://loading.io/css/)
export function inlineRingSpinner(foregroundColor) {
    // color can be 'light' or 'dark'
    return <div className="inline-ring-spinner"><div className={foregroundColor}></div><div></div><div></div><div></div></div>
}

export function bigRingSpinner() {
    return <div className="big-ring-spinner"><div></div><div></div><div></div><div></div></div>
}
