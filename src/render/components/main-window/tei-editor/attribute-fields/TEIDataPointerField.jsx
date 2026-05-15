import React, { Component } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Chip, CircularProgress, IconButton, TextField, Typography } from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import { uriValidator } from "../../../../model/attribute-validators";

const fairCopy = window.fairCopy;

export default class TEIDataPointerField extends Component {
  constructor(props) {
    super(props);
    const { elementText, maxOccurs, value } = props;

    let initialValidState = { error: false, errorMessage: "", errorValues: [] };
    if (value && value !== "") {
      const values = maxOccurs ? value.split(" ") : [value];
      initialValidState = this.validateValues(values);
    }
    this.state = {
      ...initialValidState,
      reconciliationOptions: [],
      loading: false,
      inputValue: value ? String(value) : (elementText || ""),
    };

    this.requestID = uuidv4();
    this.fetchTimeout = null;
  }

  componentDidMount() {
    const { elementText, reconciliationConfig } = this.props;
    fairCopy.ipcRegisterCallback('reconciliationResult', this.handleReconciliationResult);
    fairCopy.ipcRegisterCallback('reconciliationFailed', this.handleReconciliationFailed);
    if (reconciliationConfig?.active) {
      // fetch API query results on mount
      this.fetchReconciliationData(elementText || "");
    }
  }

  componentWillUnmount() {
    fairCopy.ipcRemoveListener('reconciliationResult', this.handleReconciliationResult);
    fairCopy.ipcRemoveListener('reconciliationFailed', this.handleReconciliationFailed);
    if (this.fetchTimeout) {
      clearTimeout(this.fetchTimeout);
    }
  }

  componentDidUpdate(prevProps) {
    const { elementText, value, reconciliationConfig } = this.props;

    // ensure re-render updates input value appropriately
    if (prevProps.elementText !== elementText || prevProps.value !== value) {
      const newInputValue = value ? String(value) : (elementText || "");
      this.setState({ inputValue: newInputValue });
      if (reconciliationConfig?.active && newInputValue) {
        // re-run the API query automatically in case we clicked on a different element
        this.fetchReconciliationData(newInputValue);
      }
    }
  }

  handleReconciliationResult = (event, data) => {
    if (data.requestID === this.requestID) {
      this.setState({ reconciliationOptions: data.results, loading: false });
    }
  }

  handleReconciliationFailed = (event, data) => {
    if (data.requestID === this.requestID) {
      console.error("Reconciliation API Error:", data.error);
      this.setState({ reconciliationOptions: [], loading: false });
    }
  }

  fetchReconciliationData = (query) => {
    const { reconciliationConfig } = this.props;
    if (!reconciliationConfig || !reconciliationConfig.active || !reconciliationConfig.endpoint || !query) {
      // bail out if not configured
      this.setState({ reconciliationOptions: [], loading: false });
      return;
    }

    this.setState({ loading: true });

    // make the request to the reconciliation API endpoint with the query and data type
    fairCopy.ipcSend('requestReconciliationQuery', {
      endpoint: reconciliationConfig.endpoint,
      query,
      dataType: reconciliationConfig.dataType,
      requestID: this.requestID
    });
  }

  onInputChange = (event, newInputValue, reason) => {
    if (reason === 'reset' || reason === 'blur') {
      return;
    }
    // set input value on state and query reconciliation API, debounced 300ms
    this.setState({ inputValue: newInputValue });
    if (this.fetchTimeout) clearTimeout(this.fetchTimeout);
    this.fetchTimeout = setTimeout(() => {
      this.fetchReconciliationData(newInputValue);
    }, 300);
  }

  validateValues(values) {
    let error = false;
    let errorMessage = "";
    const errorValues = [];
    for (const value of values) {
      const validResult = uriValidator(value);
      if (validResult.error) {
        if (!error) {
          // record the specifics of the first error
          error = true;
          errorMessage = validResult.errorMessage;
        }
        // record all bad values
        errorValues.push(value);
      }
    }
    return { error, errorMessage, errorValues };
  }

  renderInput = (params) => {
    const { error, errorMessage, loading } = this.state;
    const { attrName, maxOccurs, reconciliationConfig, value } = this.props;
    const helperText =
      errorMessage && errorMessage.length > 0 ? errorMessage : " ";
    const variant = maxOccurs ? "outlined" : "standard";
    const isReconciliation = reconciliationConfig?.active;

    const onViewClick = (e) => {
      e.stopPropagation();
      // handle clicking the view link from the reconciliation API, if available
      if (value && reconciliationConfig?.viewUrl) {
          // strip underscore for NBU backwards compatibility
          let cleanId = value.startsWith('_') ? value.slice(1) : value;
          // strip leading # for NBU backwards compatibility
          cleanId = cleanId.startsWith('#') ? cleanId.slice(1) : cleanId;
          // replace {{id}} with the actual ID
          const targetUrl = reconciliationConfig.viewUrl.replace('{{id}}', cleanId);
          fairCopy.ipcSend('openWebpage', targetUrl);
      }
    };

    return (
      <TextField
        {...params}
        label={attrName}
        className="field-input"
        InputLabelProps={{ disableAnimation: true }}
        variant={variant}
        fullWidth={true}
        error={error}
        helperText={helperText}
        InputProps={{
          ...params.InputProps,
          endAdornment: (
            <React.Fragment>
              {loading && isReconciliation ? (
                <CircularProgress color="inherit" size={20} />
              ) : null}
              {isReconciliation && reconciliationConfig?.viewUrl && value ? (
                <IconButton size="small" onClick={onViewClick} title="View External Record">
                  <i className="fas fa-external-link-alt" style={{ fontSize: '14px' }}></i>
                </IconButton>
              ) : null}
              {params.InputProps.endAdornment}
            </React.Fragment>
          ),
        }}
      />
    );
  };

  renderSingleTermField() {
    const { fairCopyProject, onChangeCallback, resourceEntry, parentEntry, value, reconciliationConfig } = this.props;
    const isReconciliation = reconciliationConfig?.active;
    const { idMap } = fairCopyProject;
    let options = [];
    if (isReconciliation) {
      options = this.state.reconciliationOptions;
    } else if (idMap) {
      options = idMap.getRelativeURIList(resourceEntry?.localID, parentEntry?.localID);
    }

    const onChange = (e, selectedValue) => {
      let value = selectedValue?.id ? selectedValue.id : (selectedValue || "");
      if (value && value !== "") {
        const validResult = this.validateValues([value]);
        this.setState(validResult);
        onChangeCallback(value, validResult.error);
      } else {
        this.setState({ error: false, errorMessage: "", errorValues: [] });
        onChangeCallback(value, false);
      }
    };

    return (
      <Autocomplete
        freeSolo
        value={value || ""}
        options={options}
        onInputChange={isReconciliation ? this.onInputChange : undefined}
        inputValue={isReconciliation ? this.state.inputValue : undefined}
        onChange={onChange}
        getOptionLabel={(option) => option.name ? option.name : (option.id || option)}
        renderOption={(option) => (
          <div>
            <Typography variant="body1">{option.name || option}</Typography>
            {option.id && (
              <Typography variant="caption" color="textSecondary" style={{ display: 'block' }}>
                {option.id}
              </Typography>
            )}
            {option.description && (
              <Typography variant="caption" color="textSecondary" style={{ display: 'block' }}>
                {option.description}
              </Typography>
            )}
          </div>
        )}
        noOptionsText={
          isReconciliation
            ? "No matching records found on remote service."
            : "No matching local XML:IDs found."
        }
        renderInput={this.renderInput}
      />
    );
  }

  valuesToOptions(values) {
    return values.map((value) => {
      const error = this.state.errorValues
        ? this.state.errorValues.includes(value)
        : false;
      return { value, error };
    });
  }

  optionsToValues(options) {
    return options.map((o) => (o.value ? o.value : o));
  }

  renderMultiTermField() {
    const { fairCopyProject, resourceEntry, parentEntry, value, reconciliationConfig, onChangeCallback } = this.props;
    const { idMap } = fairCopyProject;

    const isReconciliation = reconciliationConfig?.active;
    const values = value && value.length > 0 ? value.split(" ") : [];
    const selectedOptions = this.valuesToOptions(values);
    let options = [];
    if (isReconciliation) {
      options = this.state.reconciliationOptions.map(opt => ({
        value: opt.id,
        label: opt.name,
        description: opt.description,
        error: false
      }));
    } else if (idMap) {
      options = this.valuesToOptions(
        idMap.getRelativeURIList(resourceEntry?.localID, parentEntry?.localID)
      );
    }

    const onChange = (e, newOptions) => {
      const newValues = newOptions.map(opt => opt.value || opt.id || opt );
      const validResult = this.validateValues(newValues);
      this.setState(validResult);
      const str = newValues.join(" ");
      onChangeCallback(str, validResult.error);
    };

    const renderTags = (tagValues, getTagProps) => {
      return tagValues.map((option, index) => {
        const color = option.error ? "red" : "black";
        return (
          <Chip
            variant="outlined"
            style={{ color, maxWidth: 200 }}
            label={option.label || option.value || option}
            {...getTagProps({ index })}
          />
        );
      });
    };

    return (
      <Autocomplete
        freeSolo
        multiple
        disableClearable
        value={selectedOptions}
        options={options}
        onInputChange={isReconciliation ? this.onInputChange : undefined}
        inputValue={isReconciliation ? this.state.inputValue : undefined}
        onChange={onChange}
        getOptionLabel={(option) => option.label || option.value || option}
        filterSelectedOptions
        renderOption={(option) => (
          <div>
            <Typography variant="body1">{option.label || option.value || option}</Typography>
            {option.value && option.label !== option.value && (
              <Typography variant="caption" color="textSecondary" style={{ display: 'block' }}>
                {option.value}
              </Typography>
            )}
            {option.description && (
              <Typography variant="caption" color="textSecondary" style={{ display: 'block' }}>
                {option.description}
              </Typography>
            )}
          </div>
        )}
        noOptionsText={
          isReconciliation
            ? "No matching records found on remote service."
            : "No matching local XML:IDs found."
        }
        renderInput={this.renderInput}
        renderTags={renderTags}
      />
    );
  }

  render() {
    const { maxOccurs, reconciliationConfig } = this.props;
    const isReconciliation = reconciliationConfig?.active;

    return (
      <div style={{ display: "flex" }} className="data-pointer-wrapper">
        {maxOccurs && !isReconciliation ? this.renderMultiTermField() : this.renderSingleTermField()}
      </div>
    );
  }
}
