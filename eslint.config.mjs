import next from "eslint-config-next";

const config = [
  ...next,
  {
    rules: {
      // Allow native video handling for fine-grained control
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
