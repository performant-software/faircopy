import React, { Component } from 'react'
import { Button, Typography } from '@material-ui/core'
import { Dialog, TextField, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'
import { sendFeedback } from '../../../model/feedback'

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

            // cap message length (to prevent phonebook cut and paste)
            if( value.length < 10000 ) {
                const nextState = { ...this.state }
                nextState[name] = value
                this.setState(nextState)    
            }
        }

        const onSuccess = () => {
            onClose()
        }

        const onError = (error) => {
            this.setState({ ...this.state, error })     
        }

        const onSend = (e) => {
            const { message } = this.state

            if( message.length > 0 ) {
                const { appConfig } = this.props
                const { version, devMode } = appConfig        
                sendFeedback(devMode,message,version,onSuccess,onError)    
            }
        }

        return (
            <Dialog
                id="FeedbackNotesDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">User Feedback Form</DialogTitle>
                <DialogContent>
                    <div className="form">
                        <Typography className="instructions" >Please enter a message to send to the developers of FairCopy. Bug reports, feature requests, and general comments are welcome.</Typography>
                        <TextField 
                            name="message"
                            value={message}
                            multiline
                            rows={6}
                            className="form-field"
                            variant="outlined"
                            onChange={onChange}
                            label="Your Message"
                            autoFocus={true}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button color="primary" disabled={ message.length === 0 } variant="contained" onClick={onSend}>Send</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}
