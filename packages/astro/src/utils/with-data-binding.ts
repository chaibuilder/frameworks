import { get, isEmpty, isObject, replace, trim } from "lodash";

/**
 * Replaces dynamic placeholders in a data object with values from external data source
 *
 * @param templateString - String containing placeholders in {{path}} format
 * @param externalData - Source data for placeholder replacement
 * @returns Processed string with placeholders replaced by actual values
 */
function withDataBinding<T extends string | object>(template: T, externalData: any): T {
  if (!template || isEmpty(externalData)) return template;

  let templateString: any = template;

  if (isObject(templateString)) {
    templateString = JSON.stringify(templateString);
  }

  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const processedString = replace(templateString, placeholderRegex, (match, path) => {
    const value = get(externalData, trim(path));
    return value !== undefined ? String(value) : match;
  });

  // * If template is an object, return the processed string as an object
  if (isObject(template)) {
    try {
      return JSON.parse(processedString) as T;
    } catch (error) {
      return processedString as T;
    }
  }

  return processedString as T;
}

export { withDataBinding };
