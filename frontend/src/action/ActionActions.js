import { notification } from "antd";
import requestWrapper from "../shared/requestWrapper";

import { fetchContainers } from "../container/ContainerActions";

export const REFRESH_FORM_STATE = "REFRESH_FORM_STATE";
export const UPDATE_FORM_STATE = "UPDATE_FORM_STATE";

export const OPEN_FILTER_MODAL = "OPEN_FILTER_MODAL";
export const CLOSE_FILTER_MODAL = "CLOSE_FILTER_MODAL";

export const OPEN_CONDITION_GROUP_MODAL = "OPEN_CONDITION_GROUP_MODAL";
export const CLOSE_CONDITION_GROUP_MODAL = "CLOSE_CONDITION_GROUP_MODAL";

export const createAction = ({
  containerId,
  payload,
  onError,
  onSuccess
}) => dispatch => {
  payload.container = containerId;

  const parameters = {
    url: `/workflow/`,
    method: "POST",
    errorFn: onError,
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Action created",
        description: "The action was successfully created."
      });
    },
    payload
  };

  requestWrapper(parameters);
};

export const updateAction = ({
  actionId,
  payload,
  onError,
  onSuccess
}) => dispatch => {
  delete payload["datalab"];

  const parameters = {
    url: `/workflow/${actionId}/`,
    method: "PATCH",
    errorFn: onError,
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Action updated",
        description: "The action was successfully updated."
      });
    },
    payload
  };

  requestWrapper(parameters);
};

export const deleteAction = ({ actionId, onFinish }) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/`,
    method: "DELETE",
    errorFn: error => {
      onFinish();
      notification["error"]({
        message: "Action deletion failed",
        description: error
      });
    },
    successFn: () => {
      onFinish();
      dispatch(fetchContainers());
      notification["success"]({
        message: "Action deleted",
        description: "The action was successfully deleted."
      });
    }
  };

  requestWrapper(parameters);
};

export const cloneAction = ({ actionId, onFinish }) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/clone_action/`,
    method: "POST",
    errorFn: error => {
      onFinish();
      notification["error"]({
        message: "Action clone failed",
        description: error
      });
    },
    successFn: () => {
      onFinish();
      dispatch(fetchContainers());
      notification["success"]({
        message: "Action cloned",
        description: "The action was successfully cloned."
      });
    }
  };

  requestWrapper(parameters);
};

export const fetchFeedback = ({
  actionId,
  jobId,
  onError,
  onSuccess
}) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/feedback/?job=${jobId}`,
    method: "GET",
    errorFn: error => {
      onError();
      console.log(error);
    },
    successFn: feedback => {
      onSuccess(feedback);
    }
  };

  requestWrapper(parameters);
};

export const submitFeedback = ({
  actionId,
  jobId,
  payload,
  onError,
  onSuccess
}) => {
  const parameters = {
    url: `/workflow/${actionId}/submit_feedback/?job=${jobId}`,
    method: "POST",
    errorFn: error => {
      onError();
      console.log(error);
    },
    successFn: feedback => {
      onSuccess(feedback);
    },
    payload
  };

  requestWrapper(parameters);
};

export const fetchAction = ({ actionId, onError, onSuccess }) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/retrieve_workflow/`,
    method: "GET",
    errorFn: error => {
      onError();
      console.log(error);
    },
    successFn: action => onSuccess(action)
  };

  requestWrapper(parameters);
};

const refreshFormState = payload => ({
  type: REFRESH_FORM_STATE,
  payload
});

export const updateFormState = payload => ({
  type: UPDATE_FORM_STATE,
  payload
});

export const openFilterModal = filter => {
  // Map the object representing the Filter model from the database into
  // the form object that will be used in the modal
  let formState = { formulas: [] };

  if (filter) {
    formState.type = { name: "type", value: filter.type };

    filter.formulas.forEach((formula, i) => {
      formState.formulas.push({});
      formState.formulas[i].fieldOperator = {
        name: `formulas[${i}].fieldOperator`,
        value: [formula.field, formula.operator]
      };

      formState.formulas[i].comparator = {
        name: `formulas[${i}].comparator`,
        value: formula.comparator
      };
    });
  } else {
    formState.formulas.push({});
  }

  return {
    type: OPEN_FILTER_MODAL,
    formState
  };
};

export const closeFilterModal = () => ({
  type: CLOSE_FILTER_MODAL
});

const validateFilterErrors = formState => {
  // Reset the errors in the form if the field has a value
  // Because we are directly modifying the form state,
  // this step is necessary to ensure that error messages do not get incorrectly displayed
  let hasError = false;
  formState.formulas.forEach((formula, i) => {
    Object.keys(formula).forEach(field => {
      field = formState.formulas[i][field];
      if (field.value) {
        field["errors"] = undefined;
      } else {
        hasError = true;
      }
    });
  });
  return hasError;
};

export const addFormulaToFilter = () => (dispatch, getState) => {
  const { action } = getState();
  let formState = Object.assign({}, action.formState);

  const hasError = validateFilterErrors(formState);

  formState.formulas.push({
    fieldOperator: hasError ? { errors: [{}] } : {},
    comparator: hasError ? { errors: [{}] } : {}
  });

  dispatch(refreshFormState(formState));
};

export const deleteFormulaFromFilter = formulaIndex => (dispatch, getState) => {
  const { action } = getState();
  let formState = Object.assign({}, action.formState);
  formState.formulas.splice(formulaIndex, 1);

  validateFilterErrors(formState);

  dispatch(refreshFormState(formState));
};

export const updateFilter = ({
  actionId,
  payload,
  onError,
  onSuccess
}) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/update_filter/`,
    method: "PUT",
    errorFn: error => onError(error),
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Filter updated",
        description: "The filter was successfully updated."
      });
    },
    payload: payload
  };

  requestWrapper(parameters);
};

export const openConditionGroupModal = conditionGroup => {
  // Map the object representing the Condition Group model from the database into
  // the form object that will be used in the modal
  let formState = { conditions: [] };

  if (conditionGroup) {
    formState.name = { name: "name", value: conditionGroup.name };

    conditionGroup.conditions.forEach((condition, i) => {
      formState.conditions.push({ formulas: [] });
      formState.conditions[i].name = {
        name: `conditions[${i}].name`,
        value: condition.name
      };
      formState.conditions[i].type = {
        name: `conditions[${i}].type`,
        value: condition.type
      };

      condition.formulas.forEach((formula, j) => {
        formState.conditions[i].formulas.push({});
        formState.conditions[i].formulas[j].fieldOperator = {
          name: `conditions[${i}].formulas[${j}].fieldOperator`,
          value: [formula.field, formula.operator]
        };
        formState.conditions[i].formulas[j].comparator = {
          name: `conditions[${i}].formulas[${j}].comparator`,
          value: formula.comparator
        };
      });
    });
  } else {
    formState.conditions.push({ formulas: [{}] });
  }

  return {
    type: OPEN_CONDITION_GROUP_MODAL,
    formState,
    conditionGroup
  };
};

export const closeConditionGroupModal = () => ({
  type: CLOSE_CONDITION_GROUP_MODAL
});

const validateConditionGroupErrors = formState => {
  // Reset the errors in the form if the field has a value
  // Because we are directly modifying the form state,
  // this step is necessary to ensure that error messages do not get incorrectly displayed
  if (formState.name && formState.name.value) formState.name.errors = undefined;

  let hasError;
  formState.conditions.forEach((condition, i) => {
    if (condition.name && condition.name.value)
      condition.name.errors = undefined;

    condition.formulas.forEach((formula, j) => {
      Object.keys(formula).forEach(field => {
        field = formState.conditions[i].formulas[j][field];
        if (field.value) {
          field["errors"] = undefined;
        } else {
          hasError = true;
        }
      });
    });
  });
  return hasError;
};

export const addConditionToConditionGroup = () => (dispatch, getState) => {
  const { action } = getState();
  let formState = Object.assign({}, action.formState);

  const hasError = validateConditionGroupErrors(formState);

  formState.conditions.push({
    formulas: [
      {
        fieldOperator: hasError ? { errors: [{}] } : {},
        comparator: hasError ? { errors: [{}] } : {}
      }
    ]
  });

  dispatch(refreshFormState(formState));
};

export const deleteConditionFromConditionGroup = conditionIndex => (
  dispatch,
  getState
) => {
  const { action } = getState();
  let formState = Object.assign({}, action.formState);
  formState.conditions.splice(conditionIndex, 1);

  validateConditionGroupErrors(formState);

  dispatch(refreshFormState(formState));
};

export const addFormulaToConditionGroup = conditionIndex => (
  dispatch,
  getState
) => {
  const { action } = getState();
  let formState = Object.assign({}, action.formState);

  const hasError = validateConditionGroupErrors(formState);

  formState.conditions[conditionIndex].formulas.push({
    fieldOperator: hasError ? { errors: [{}] } : {},
    comparator: hasError ? { errors: [{}] } : {}
  });

  dispatch(refreshFormState(formState));
};

export const deleteFormulaFromConditionGroup = (
  conditionIndex,
  formulaIndex
) => (dispatch, getState) => {
  const { action } = getState();
  let formState = Object.assign({}, action.formState);
  formState.conditions[conditionIndex].formulas.splice(formulaIndex, 1);

  validateConditionGroupErrors(formState);

  dispatch(refreshFormState(formState));
};

export const createConditionGroup = ({
  actionId,
  payload,
  onError,
  onSuccess
}) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/create_condition_group/`,
    method: "PUT",
    errorFn: error => onError(error),
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Condition group created",
        description: "The condition group was successfully created."
      });
    },
    payload: payload
  };

  requestWrapper(parameters);
};

export const updateConditionGroup = ({
  actionId,
  conditionGroup,
  payload,
  onError,
  onSuccess
}) => dispatch => {
  payload.originalName = conditionGroup.name;
  const parameters = {
    url: `/workflow/${actionId}/update_condition_group/`,
    method: "PUT",
    errorFn: error => onError(error),
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Condition group updated",
        description: "The condition group was successfully updated."
      });
    },
    payload: payload
  };

  requestWrapper(parameters);
};

export const deleteConditionGroup = ({
  actionId,
  index,
  onSuccess
}) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/delete_condition_group/`,
    method: "PUT",
    errorFn: error => console.log(error),
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Condition group deleted",
        description: "The condition group was successfully deleted."
      });
    },
    payload: { index: index }
  };

  requestWrapper(parameters);
};

export const updateContent = ({
  actionId,
  payload,
  onError,
  onSuccess
}) => dispatch => {
  const parameters = {
    url: `/workflow/${actionId}/update_content/`,
    method: "PUT",
    errorFn: error => onError(error),
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Content saved",
        description: "The content was successfully saved."
      });
    },
    payload: payload
  };

  requestWrapper(parameters);
};

export const previewContent = ({ actionId, payload, onError, onSuccess }) => {
  const parameters = {
    url: `/workflow/${actionId}/preview_content/`,
    method: "PUT",
    errorFn: error => {
      onError(error);
    },
    successFn: response => onSuccess(response),
    payload
  };

  requestWrapper(parameters);
};

export const sendEmail = ({ actionId, payload, onError, onSuccess }) => {
  const parameters = {
    url: `/workflow/${actionId}/send_email/`,
    method: "PUT",
    errorFn: error => onError(error),
    successFn: () => {
      onSuccess();
      notification["success"]({
        message: "Emails sent",
        description: "The emails were successfully sent"
      });
    },
    payload
  };

  requestWrapper(parameters);
};

export const updateSchedule = ({
  selected,
  payload,
  onError,
  onSuccess,
  isCreate
}) => {
  const parameters = {
    url: `/workflow/${selected}/update_schedule/`,
    method: "PATCH",
    errorFn: onError,
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: `Schedule ${isCreate ? "created" : "updated"}`,
        description: `The schedule was successfully ${
          isCreate ? "created" : "updated"
        }.`
      });
    },
    payload
  };

  requestWrapper(parameters);
};

export const deleteSchedule = ({ selected, onError, onSuccess }) => {
  const parameters = {
    url: `/workflow/${selected}/delete_schedule/`,
    method: "PATCH",
    errorFn: onError,
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Schedule deleted",
        description: "The schedule was successfully deleted."
      });
    }
  };
  requestWrapper(parameters);
};

export const updateEmailSettings = ({
  actionId,
  payload,
  onError,
  onSuccess
}) => {
  const parameters = {
    url: `/workflow/${actionId}/update_email_settings/`,
    method: "PATCH",
    errorFn: error => onError(error),
    successFn: action => {
      onSuccess(action);
      notification["success"]({
        message: "Email settings updated",
        description: "The email settings were successfully updated."
      });
    },
    payload
  };
  requestWrapper(parameters);
};


export const uploadImage = ({
  actionId,
  file,
  alt,
  closePopover,
  onError,
  onSuccess
}) => () => {
  const data = new FormData();
  data.append("file", file, file.name);
  data.append("alt", alt);

  const parameters = {
    url: `/workflow/${actionId}/upload_image/`,
    method: "POST",
    errorFn: error => {
      console.log(error);
      onError();
      closePopover();
    },
    successFn: action => {
      onSuccess(action);
      closePopover();
    }
  };

  requestWrapper(parameters);
};
