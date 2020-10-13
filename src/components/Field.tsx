import React from 'react';
import { Note } from '@contentful/forma-36-react-components';
import { FieldExtensionSDK } from 'contentful-ui-extensions-sdk';

interface FieldProps {
  sdk: FieldExtensionSDK;
}

const Field = (props: FieldProps) => {

  console.log(props.sdk.window.updateHeight(50));
  return <Note>This field is edited in the Side Bar</Note>;
};

export default Field;
