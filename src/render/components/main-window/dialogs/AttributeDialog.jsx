import React, { Component } from 'react';
import {
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import { v4 as uuidv4 } from 'uuid';

const fairCopy = window.fairCopy;

class ReconciliationConfigDialog extends Component {
    constructor(props) {
        super(props);
        this.state = {
            config: props.config || { active: false, endpoint: '', dataType: '' },
            manifestTypes: [],
            loading: false
        };
        this.requestID = uuidv4();
        this.fetchTimeout = null;
    }

    componentDidMount() {
        if (fairCopy?.ipcRegisterCallback) {
            fairCopy.ipcRegisterCallback('reconciliationManifestResult', this.handleManifestResult);
            fairCopy.ipcRegisterCallback('reconciliationManifestFailed', this.handleManifestFailed);
        }

        if (this.state.config.endpoint) {
            this.fetchManifest(this.state.config.endpoint);
        }
    }

    componentWillUnmount() {
        if (fairCopy?.ipcRemoveListener) {
            fairCopy.ipcRemoveListener('reconciliationManifestResult', this.handleManifestResult);
            fairCopy.ipcRemoveListener('reconciliationManifestFailed', this.handleManifestFailed);
        }
    }

    handleManifestResult = (event, payload) => {
        if (payload.requestID === this.requestID) {
            const data = payload.data;
            if (data.defaultTypes) {
                const typeIds = data.defaultTypes.map(t => t.id);
                const viewUrl = data.view?.url || '';
                this.updateConfig({ viewUrl });
                this.setState({ manifestTypes: typeIds, loading: false });
            } else {
                this.setState({ manifestTypes: [], loading: false });
            }
        }
    }

    handleManifestFailed = (event, payload) => {
        if (payload.requestID === this.requestID) {
            console.error("Failed to fetch reconciliation manifest:", payload.error);
            this.setState({ manifestTypes: [], loading: false });
        }
    }

    fetchManifest = (url) => {
        if (!url) return;
        this.setState({ loading: true });
        fairCopy.ipcSend('requestReconciliationManifest', {
            endpoint: url,
            requestID: this.requestID
        });
    }

    updateConfig = (updates) => {
        const nextConfig = { ...this.state.config, ...updates };
        this.setState({ config: nextConfig });

        if (updates.endpoint !== undefined) {
            if (this.fetchTimeout) clearTimeout(this.fetchTimeout);
            this.fetchTimeout = setTimeout(() => {
                this.fetchManifest(nextConfig.endpoint);
            }, 500);
        }
    }

    render() {
        const { currentAttribute, onClose, onSave } = this.props;
        const { config, manifestTypes, loading } = this.state;

        return (
            <Dialog open={true} onClose={onClose} aria-labelledby="reconciliation-config-dialog">
                <DialogTitle id="reconciliation-config-dialog">Autocomplete: {currentAttribute}</DialogTitle>
                <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px', paddingTop: '8px' }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={config.active}
                                onChange={(e) => this.updateConfig({ active: e.target.checked })}
                                color="primary"
                            />
                        }
                        label="Enable Remote Data Source"
                    />
                    <TextField
                        label="Reconciliation Manifest URL"
                        variant="outlined"
                        fullWidth
                        disabled={!config.active}
                        value={config.endpoint || ''}
                        onChange={(e) => this.updateConfig({ endpoint: e.target.value })}
                    />
                    <Autocomplete
                        freeSolo
                        disabled={!config.active}
                        options={manifestTypes}
                        value={config.dataType || ''}
                        onChange={(event, newValue) => {
                            this.updateConfig({ dataType: newValue || '' });
                        }}
                        onInputChange={(event, newInputValue) => {
                            this.updateConfig({ dataType: newInputValue });
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Data Type (Optional)"
                                variant="outlined"
                                helperText={loading ? "Fetching types from API..." : "Type filter for reconciliation queries"}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <React.Fragment>
                                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onSave(config)} color="primary">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default class AttributeDialog extends Component {

    constructor(props) {
        super(props);
        this.state = {
            currentAttribute: null
        };
    }

    renderTable() {
        const {elementName, teiSchema, fairCopyConfig, onUpdateConfig} = this.props
        const {elements} = fairCopyConfig
        const {attrState} = elements[elementName]

        const tableRows = []
        for( const attrName of Object.keys(attrState) ) {
            const attr = teiSchema.getAttrSpec( attrName, elementName )

            if( !attr.hidden ) {
                const onChange = () => {
                    const active = !attrState[attrName].active
                    fairCopyConfig.elements[elementName].attrState[attrName] = { ...attrState[attrName], active }
                    onUpdateConfig(fairCopyConfig)
                }

                const isPointer = attr.dataType === "teidata.pointer";

                tableRows.push(
                    <TableRow key={`attr-row-${attrName}`} >
                        <TableCell>
                            <Checkbox
                                color="primary"
                                checked={attrState[attrName].active}
                                onChange={onChange}
                            />
                        </TableCell>
                        <TableCell>{attrName}</TableCell>
                        <TableCell>{attr.description}</TableCell>
                        <TableCell>
                            {isPointer && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => this.setState({ currentAttribute: attrName })}
                                >
                                    Configure
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                )
            }
        }

        return (
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                        </TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Autocomplete</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    { tableRows }
                </TableBody>
            </Table>
        )
    }


    renderReconciliationConfig() {
        const { currentAttribute } = this.state;
        const { elementName, fairCopyConfig, onUpdateConfig } = this.props;

        if (!currentAttribute) return null;

        const attrStateNode = fairCopyConfig.elements[elementName].attrState[currentAttribute];
        const config = attrStateNode?.reconciliation || { active: false, endpoint: '', dataType: '' };

        const handleSave = (newConfig) => {
            attrStateNode.reconciliation = newConfig;
            onUpdateConfig(fairCopyConfig);
            this.setState({ currentAttribute: null });
        };

        return (
            <ReconciliationConfigDialog
                currentAttribute={currentAttribute}
                config={config}
                onClose={() => this.setState({ currentAttribute: null })}
                onSave={handleSave}
            />
        );
    }

    render() {
        const { open, onClose, elementName } = this.props

        if( !elementName ) return null
        const displayName = elementName.startsWith('mark') ? elementName.slice('mark'.length) : elementName

        return (
            <>
                <Dialog open={open} onClose={onClose} aria-labelledby="attribute-dialog">
                    <DialogTitle id="attribute-dialog">Available Attributes for {displayName}</DialogTitle>
                    <DialogContent>
                        <Typography>Select attributes to describe this element. These attributes will appear for every instance of {displayName}.</Typography>
                        { this.renderTable() }
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} color="primary">
                            Done
                        </Button>
                    </DialogActions>
                </Dialog>
                {this.renderReconciliationConfig()}
            </>
        )
    }

}
