import axios from 'axios'

export function getReconciliationManifest(endpoint, onSuccess, onFail) {
    axios.get(endpoint, {
        headers: {
            'Accept': 'application/json'
        }
    }).then(
        (response) => {
            onSuccess(response.data)
        },
        (error) => {
            onFail(error)
        }
    )
}

export function queryReconciliationAPI(endpoint, query, dataType, onSuccess, onFail) {
    const payload = {
        queries: {
            q0: {
                query: query,
                type: dataType || undefined
            }
        }
    }
    axios.post(endpoint, payload, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }).then(
        (response) => {
            const results = response.data.q0?.result || []
            onSuccess(results)
        },
        (error) => {
            onFail(error)
        }
    )
}
