from rest_framework_mongoengine import viewsets
from rest_framework_mongoengine.validators import ValidationError
from rest_framework.decorators import detail_route

from django.http import JsonResponse

from .serializers import WorkflowSerializer
from .models import Workflow
from matrix.views import combine_data
from matrix.models import Matrix

from collections import defaultdict
import re


class WorkflowViewSet(viewsets.ModelViewSet):
    lookup_field = 'id'
    serializer_class = WorkflowSerializer

    def get_queryset(self):
        return Workflow.objects.all()

    def substitute_value(self, field_name, secondary_columns, item):
        secondary_column = next((x for x in secondary_columns if x['field'] == field_name), None)
        # Enclose string values with quotation marks, otherwise simply return the number value as is
        # Still must be returned as a string, since eval() takes a string input
        if secondary_column['type'] == 'text':
            return '\'{0}\''.format(item[field_name])
        else:
            return str(item[field_name])

    def evaluate_conditions(self, matrix, conditions):
        data = combine_data(matrix) # combine_data method from Matrix view
        primaryField = matrix['primaryColumn'].field
        conditions_passed = defaultdict(list)
        # Iterate over the rows in the data and return any rows which pass true
        for item in data:
            for condition in conditions:
                # Each row in the data is represented by a dict of the columns of the matrix (as the key) and the respective values for that row
                # Regex matches the formula of the condition against two groups: "{{field_name}}" (group 1) and "field_name" (group 2)
                # Lambda function takes the matched string's "field_name" (group 2) as input and returns the value of the key "field_name" in the row dict
                # The resulting value is then used to replace "{{field_name}}" (group 1) in the formula
                populated_formula = re.sub(r'({{([^\s]+)}})', lambda match: self.substitute_value(match.group(2), matrix['secondaryColumns'], item), condition['formula'])
                # Eval the populated formula to see if the condition passes for this row
                # If the row passes the condition, then add the row to the dict of conditions
                try:
                    # TO DO: consider security implications of using eval()
                    if eval(populated_formula):
                        conditions_passed[condition['name']].append(item)
                except:
                    raise ValidationError('An issue occured while trying to evaluate the condition. Do each of the fields used in the formula have the correct \'type\' set?')        
        return conditions_passed

    def perform_create(self, serializer):
        matrix = Matrix.objects.get(id=self.request.data['matrix'])
        conditions = self.request.data['conditions']

        # Confirm that all provided fields are defined in the matrix
        secondary_columns = [secondary_column.field for secondary_column in matrix['secondaryColumns']]
        for condition in conditions:
            formula = condition['formula']
            fields = re.findall(r'{{([^\s]+)}}', formula)
            for field in fields:
                if field not in secondary_columns:
                    raise ValidationError('Invalid formula: field \'{0}\' does not exist in the matrix'.format(field))

        conditions_passed = self.evaluate_conditions(matrix, conditions)

        serializer.save(owner=self.request.user.id)