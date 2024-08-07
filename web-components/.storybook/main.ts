import { dirname, join } from "path";
import * as webpack from "webpack";
import { commonDev } from "../webpack.config";

/**
 * merge two arrays into one and remove the duplicates
 *
 * @param merger
 * @param mergee
 * @returns {Array<any>} merged unique array
 */
const mergeUnique = (merger: Array<any>, mergee?: Array<any>) =>
  mergee ? merger.concat(mergee.filter((item: any) => merger.indexOf(item) === -1)) : merger;

module.exports = {
  stories: [
    "../src/components/**/*.stories.ts",
    "../src/components/**/*.mdx",
    "../src/internal-components/color-table/ColorTable.stories.ts",
    "../src/internal-components/color-table/*.mdx"
  ],

  addons: [
    getAbsolutePath("@storybook/addon-knobs"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-controls"),
    getAbsolutePath("@storybook/addon-actions"),
    getAbsolutePath("@storybook/addon-viewport"),
    "@storybook/addon-webpack5-compiler-babel",
    "@chromatic-com/storybook"
  ],

  webpackFinal: async (
    storybookConfig: webpack.Configuration,
    { configType }: { configType: "DEVELOPMENT" | "PRODUCTION" }
  ) => {
    console.log("Storybook build mode: ", configType);

    // RESOLVE
    storybookConfig.resolve = storybookConfig.resolve || {};
    storybookConfig.resolve.fallback = commonDev.resolve?.fallback;

    // EXTENSIONS
    storybookConfig.resolve.extensions = mergeUnique(
      storybookConfig.resolve?.extensions || [],
      commonDev.resolve?.extensions || []
    );

    // ALIAS
    storybookConfig.resolve.alias = commonDev.resolve?.alias;

    // MODULE
    storybookConfig.module = storybookConfig.module || { rules: [] };

    // RULES
    storybookConfig.module.rules = mergeUnique(storybookConfig.module.rules || [], commonDev.module?.rules || []);

    // PLUGINS

    // Storybook production has it's own tuned HtmlWebpackPlugin
    const omitPluginNames = configType === "DEVELOPMENT" ? [] : ["HtmlWebpackPlugin"];
    
    const plugins = (commonDev.plugins || []).filter(p => p && omitPluginNames.indexOf(p.constructor.name) === -1);

    storybookConfig.plugins = mergeUnique(storybookConfig.plugins || [], plugins);

    return storybookConfig;
  },

  framework: {
    name: getAbsolutePath("@storybook/web-components-webpack5"),
    options: {}
  },

  docs: {}
};

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
