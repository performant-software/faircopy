export function manifestTemplate() {
    return {
        "@context": [
            "http://www.w3.org/ns/anno.jsonld",
            "http://iiif.io/api/presentation/3/context.json"
        ],
        "id": "",
        "type": "Manifest",
        "items": []    
    }
}

export function canvasTemplate() {
    return {
        "id": "",
        "type": "Canvas",
        "items": [
            {
                "id": "",
                "type": "AnnotationPage",
                "items": [
                    
                ]
            }
        ]
    }
}

export function annotationTemplate() {
    return {
        "@context": "https://www.w3.org/ns/anno.jsonld",
        "id": "",
        "type": "Annotation",
        "motivation": "",
        "body": {
            "id": "",
            "format": ""
        },
        "target": ""
    }    
}

export function annotationPageTemplate() {
    return {
        "id": "",
        "type": "AnnotationPage",
        "items": [
            
        ]
    }    
}