import { Component } from 'react'

import { bigJSON } from '../../workers/big-json-worker'
import { searchIndex } from '../../workers/search-index-worker'
import { projectArchive } from '../../workers/project-archive-worker'

const fairCopy = window.fairCopy

// This is a hidden window that runs workers. 
export default class WorkerWindow extends Component {

    constructor() {
        super()
        this.state = {
            workers: { 
                'big-json': bigJSON,
                'search-index': searchIndex,
                'project-archive': projectArchive
            }
        }
    }

    componentDidMount() {

        const electron = fairCopy.services.getElectron()

        const postMessage = (msg) => {
            const { workerID } = this.state
            electron.ipcRenderer.send('worker-window-message',workerID,msg)
        }   

        const close = () => {
            const { workerID } = this.state
            electron.ipcRenderer.send('close-worker-window',workerID)
        }

        const workerMethods = { postMessage, close }

        electron.ipcRenderer.on('init',(e,msg) => {
            const { workerID, workerData } = msg
            console.log(`Starting worker window ${workerID}.`)
            this.setState({ ...this.state, workerID, workerData })
        })

        electron.ipcRenderer.on('message',(e,msg) => {
            const { workers, workerID, workerData } = this.state
            const worker = workers[workerID]
            worker( msg, workerMethods, workerData )
        })
    }

    render() {
        return null
    }
}
