import type { ParameterField, Params, ValidationIssue } from '../geometry/types';
export function DimensionFields({
  fields,
  params,
  onChange,
  issues,
}: {
  fields: ParameterField[];
  params: Params;
  onChange: (key: string, value: number) => void;
  issues: ValidationIssue[];
}) {
  return (
    <div className="dimension-fields">
      {fields.map((field) => {
        const error = issues.find((i) => i.field === field.key && i.severity === 'error');
        return (
          <div className="dimension-field" key={field.key}>
            <label htmlFor={`param-${field.key}`}>
              <span>{field.label}</span>
              <span className="dimension-symbol" dir="ltr">
                {field.key.length < 3 ? field.key : ''}
              </span>
            </label>
            <div className={`number-input ${error ? 'invalid' : ''}`}>
              <input
                id={`param-${field.key}`}
                aria-label={field.label}
                aria-describedby={
                  error ? `error-${field.key}` : field.help ? `help-${field.key}` : undefined
                }
                aria-invalid={!!error}
                type="number"
                inputMode="decimal"
                dir="ltr"
                step={field.step}
                min={field.min}
                max={field.key === 'rows' ? params.N - 1 : field.max}
                value={Number.isFinite(params[field.key]) ? params[field.key] : ''}
                onChange={(e) =>
                  onChange(field.key, e.target.value === '' ? NaN : e.target.valueAsNumber)
                }
              />
              <span>{field.unit ?? 'מ״מ'}</span>
            </div>
            {error ? (
              <p className="field-error" id={`error-${field.key}`} role="alert">
                {error.message}
              </p>
            ) : (
              field.help && (
                <p className="field-help" id={`help-${field.key}`}>
                  {field.help}
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
