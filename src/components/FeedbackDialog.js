import React, { Component } from 'react'
import { Button, Typography } from '@material-ui/core'
import { Dialog, TextField, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { sendFeedback } from '../tei-document/feedback'

export default class FeedbackNotesDialog extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            message: "",
            error: null
        }
        this.state = this.initialState
    }

    render() {      
        const { onClose } = this.props
        const { message } = this.state

        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSuccess = () => {
            onClose()
        }

        const onError = (error) => {
            this.setState({ ...this.state, error })     
        }

        const onSend = (e) => {
            const { message } = this.state
            const { appConfig } = this.props
            const { version, devMode } = appConfig        
            sendFeedback(devMode,message,version,onSuccess,onError)
        }

        return (
            <Dialog
                id="FeedbackNotesDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Send us Feedback</DialogTitle>
                <Typography>Please send us a message:</Typography>
                <DialogContent>
                    <TextField 
                        name="message"
                        value={message}
                        onChange={onChange}
                        label="Your message" 
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={onSend}>Send</Button>
                    <Button variant="outlined" onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>
        )
    }
}
