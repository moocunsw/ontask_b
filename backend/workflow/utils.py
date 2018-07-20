import re
from collections import defaultdict
from rest_framework_mongoengine.validators import ValidationError


def did_pass_formula(item, formula):
    operator = formula["operator"]
    comparator = formula["comparator"]

    try:
        value = item[formula["field"]]
    except KeyError:
        # This record must not have a value for this field
        return False

    if operator == "==":
        return value == comparator
    elif operator == "!=":
        return value != comparator
    elif operator == "<":
        return value < comparator
    elif operator == "<=":
        return value <= comparator
    elif operator == ">":
        return value > comparator
    elif operator == ">=":
        return value >= comparator


def evaluate_filter(data, filter):
    if not filter:
        return data

    filtered_data = list()

    # Iterate over the rows in the data and return any rows which pass true
    for item in data:
        didPass = False

        if len(filter["formulas"]) == 1:
            if did_pass_formula(item, filter["formulas"][0]):
                didPass = True

        elif filter["type"] == "and":
            pass_counts = [
                did_pass_formula(item, formula) for formula in filter["formulas"]
            ]
            if sum(pass_counts) == len(filter["formulas"]):
                didPass = True

        elif filter["type"] == "or":
            pass_counts = [
                did_pass_formula(item, formula) for formula in filter["formulas"]
            ]
            if sum(pass_counts) > 0:
                didPass = True

        if didPass:
            filtered_data.append(item)

    return filtered_data


def validate_condition_group(steps, data, condition_group):
    fields = []
    for step in steps:
        if step["type"] == "datasource":
            step = step["datasource"]
            for field in step["fields"]:
                fields.append(step["labels"][field])

    for condition in condition_group["conditions"]:
        for formula in condition["formulas"]:

            # Parse the output of the field/operator cascader from the condition group form in the frontend
            # Only necessary if this is being called after a post from the frontend
            if "fieldOperator" in formula:
                formula["field"] = formula["fieldOperator"][0]
                formula["operator"] = formula["fieldOperator"][1]
                del formula["fieldOperator"]

            if formula["field"] not in fields:
                raise ValidationError(
                    "Invalid formula: field '{0}' does not exist in the workflow details".format(
                        formula["field"]
                    )
                )


def evaluate_condition_group(data, condition_group):
    conditions_passed = {
        condition["name"]: [] for condition in condition_group["conditions"]
    }

    # Iterate over the rows in the data and return any rows which pass true
    for item in data:
        # Ensure that each item passes the test for only one condition per condition group
        matchedCount = 0

        for condition in condition_group["conditions"]:
            didPass = False

            if len(condition["formulas"]) == 1:
                if did_pass_formula(item, condition["formulas"][0]):
                    didPass = True

            elif condition["type"] == "and":
                pass_counts = [
                    did_pass_formula(item, formula) for formula in condition["formulas"]
                ]
                if sum(pass_counts) == len(condition["formulas"]):
                    didPass = True

            elif condition["type"] == "or":
                pass_counts = [
                    did_pass_formula(item, formula) for formula in condition["formulas"]
                ]
                if sum(pass_counts) > 0:
                    didPass = True

            if didPass:
                conditions_passed[condition["name"]].append(item)
                matchedCount += 1

        if matchedCount > 1:
            raise ValidationError(
                "An item has matched with more than one condition in the condition group '{0}'".format(
                    condition_group["name"]
                )
            )

    return conditions_passed


def populate_content(datalab, filter, condition_groups, content, html):
    filtered_data = evaluate_filter(datalab["data"], filter)

    # Any <br> tags in the html text will be followed by a newline (\n) character. This 
    # comes from the implementation of the package used to convert the Draft.JS content 
    # editor to html. We remove these \n characters as they break the way in which we map
    # blocks to html lines.
    html = html.replace("<br>\n", "<br>")
    
    # Split the html text by newline character, so that the blocks of the content can be
    # mapped to the according html representaiton via the index of iteration
    html = html.splitlines()

    all_conditions_passed = dict()
    # Combine all conditions from each condition group into a single dict
    for condition_group in condition_groups:
        validate_condition_group(datalab["steps"], filtered_data, condition_group)

        conditions_passed = evaluate_condition_group(filtered_data, condition_group)

        for condition in conditions_passed:
            all_conditions_passed[condition] = conditions_passed[condition]

    result = []
    for item in filtered_data:
        populated_content = ""
        # Ideally, each block in the content block map corresponds to each "line" of the 
        # html text provided, where a "line" is given by some text and ending with a 
        # newline character. However, some html elements are represented across multiple
        # lines (e.g. <ol> and <ul>) so we need to manually adjust the index depending on
        # the content provided
        index = 0
        for block in content["blocks"]:
            if block["type"] == "ConditionBlock":
                condition_name = block["data"]["name"]
                if not condition_name in all_conditions_passed:
                    raise ValidationError(
                        "The condition '{0}' does not exist in any condition group for this action".format(
                            condition_name
                        )
                    )
                if item in all_conditions_passed[condition_name]:
                    populated_content += html[index]
            else:
                # Ordered and un-ordered lists are represented across multiple lines in 
                # the html string therefore we cannot simply use the block index to get 
                # the relevant html. If the list is nested (i.e. includes some indented
                # bullet points) then there will also be </li> tags on their own line
                # that must be accounted for. This approach supports all levels of 
                # nesting.
                while html[index].strip() in [
                    "<ul>",
                    "</ul>",
                    "<ol>",
                    "</ol>",
                    "</li>",
                ]:
                    # Add the line for the opening/closing tag, then increment the index 
                    # and add the line that corresponds to the actual block content we 
                    # are currently on
                    populated_content += html[index]
                    index += 1

                populated_content += html[index]

            index += 1

        result.append(populated_content)

    return result
