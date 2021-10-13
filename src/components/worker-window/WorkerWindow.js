import { Component } from 'react'
import { runBigJSON } from '../../workers/big-json-worker'

const fairCopy = window.fairCopy

export default class WorkerWindow extends Component {

    constructor() {
        super()
        this.state = {
            workers: { 
                'big-json': runBigJSON 
            }
        }
    }

    componentDidMount() {

        const electron = fairCopy.services.getElectron()

        const postMessage = (msg) => {
            const { workerID } = this.state
            electron.ipcRenderer.send('worker-window-message',workerID,msg)
        }   

        electron.ipcRenderer.on('init',(e,msg) => {
            const { workerID, workerData } = msg
            this.setState({ ...this.state, workerID, workerData })
        })

        electron.ipcRenderer.on('message',(e,msg) => {
            const { workers, workerID, workerData } = this.state
            const worker = workers[workerID]
            worker( msg, workerData, postMessage )
        })
    }

    render() {
        return null
    }
}
