import { Component } from 'react'

import { searchIndex } from '../../workers/search-index-worker'
import { projectArchive } from '../../workers/project-archive-worker'
import { remoteProject } from '../../workers/remote-project-worker'

const fairCopy = window.fairCopy

// This is a hidden window that runs workers. 
export default class WorkerWindow extends Component {

    constructor() {
        super()
        this.state = {
            workers: { 
                'search-index': searchIndex,
                'project-archive': projectArchive,
                'remote-project': remoteProject
            }
        }
    }

    componentDidMount() {
        const postMessage = (msg) => {
            const { workerID } = this.state
            fairCopy.ipcSend('worker-window-message',workerID,msg)
        }   

        const close = () => {
            const { workerID } = this.state
            fairCopy.ipcSend('close-worker-window',workerID)
        }

        const workerMethods = { postMessage, close }

        fairCopy.ipcRegisterCallback('init',(e,msg) => {
            const { workerID, workerData } = msg
            console.log(`Starting worker window ${workerID}.`)
            this.setState({ ...this.state, workerID, workerData })
        })

        fairCopy.ipcRegisterCallback('message',(e,msg) => {
            const { workers, workerID, workerData } = this.state
            const worker = workers[workerID]
            worker( msg, workerMethods, workerData )
        })
    }

    render() {
        return null
    }
}
