export const elementSpecs = {
    "p": {
        "doc": "marks paragraphs in prose.",
    },
    "pb": {
        "docs": "marks the beginning of a new page in a paginated document."
    },
    "note": {
        "docs": "contains a note or annotation.",
    },
    "hi": {
        "attrs": {
            "rend": {
                "type": "select",
                "options": ["bold","italic","caps"]
            }
        },
        "docs": "marks a word or phrase as graphically distinct from the surrounding text, for reasons concerning which no claim is made.",
    },
    "ref": {
        "docs": "defines a reference to another location, possibly modified by additional text or comment.",
    },
    "name": {
        "docs": "contains a proper noun or noun phrase.",
        "attrs": {
            "type": {
                "type": "select",
                "options": ["person","place","artwork"]
            }
        },
    }
}