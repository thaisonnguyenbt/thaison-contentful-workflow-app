import React, { useState, useEffect } from 'react';
import { Button, Paragraph } from '@contentful/forma-36-react-components';
import { EntryAPI, SidebarExtensionSDK } from 'contentful-ui-extensions-sdk';
import { ReviewStatus, Level1Approval, Level2Approval, AfnRole, PublicationStatus } from '../utils/Enums';
import { unpublishedReferences, getLinkedAndPublishedEntries, getEntryDisplayFieldValue, sendEmailNotification, relativeDate } from '../utils/ContentfulUils';

interface SidebarProps {
  sdk: SidebarExtensionSDK;
}

const Sidebar = (props: SidebarProps) => {
  const { sdk } = props;
  let status = sdk.entry.fields.workflow.getValue();
  if (!status) {
    status = {
      reviewStatus: ReviewStatus.Draft,
      level1Approval : Level1Approval.Blank,
      level2Approval : Level2Approval.Blank
    }
    sdk.entry.fields.workflow.setValue(status);
  }
  const [loading, setLoading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState(status)
  const [publicationStatus, setPublicationStatus] = useState(PublicationStatus.Draft);
  const [relativeTime, setRelativeTime] = useState('');
  const isAdmin = useState(sdk.user.spaceMembership.admin);
  const roles = sdk.user.spaceMembership.roles.map(role => role.name);
  const displayFieldsMap : any = {};

  useEffect(() => {
    
    sdk.space.getContentTypes().then(allContentTypes => {
      allContentTypes.items.forEach(ct => {
        const contentType = JSON.parse(JSON.stringify(ct));
        displayFieldsMap[contentType.sys.id] = contentType.displayField
      })
    })

    const fields = sdk.entry.fields
    for (let key in fields) {
      if (key !== 'workflow') {
        fields[key].onValueChanged(() => {
          const newStatus = {
            reviewStatus: !!sdk.entry.getSys().publishedVersion ? ReviewStatus.Changed : ReviewStatus.Draft,
            level1Approval : Level1Approval.Blank,
            level2Approval : Level2Approval.Blank
          };
          setWorkflowStatus(newStatus);
          sdk.entry.fields.workflow.setValue(newStatus);
          getPublicationStatus();
        });
      }
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPublicationStatus = () => {
    // const sys: EntrySys = sdk.entry.getSys();
    // if (sys.version > (sys.publishedVersion || 0) + 1) {
    //   setPublicationStatus(PublicationStatus.Changed)
    // } else if (sys.version === (sys.publishedVersion || 0) + 1) {
    //   setPublicationStatus(PublicationStatus.Published)
    // }
    console.log(workflowStatus.reviewStatus )
    if (workflowStatus.reviewStatus === ReviewStatus.Published) {
      setPublicationStatus(PublicationStatus.Published);
    } else if (workflowStatus.reviewStatus === ReviewStatus.Draft) {
      setPublicationStatus(PublicationStatus.Draft);
    } else {
      setPublicationStatus(PublicationStatus.Changed);
    }

    setRelativeTime(relativeDate(new Date(sdk.entry.getSys().updatedAt).getTime()));
  }

  /**
   * When User CLick on Publish button
   */
  const onClickPublish = async () => {
    setLoading(true);
    const sys = sdk.entry.getSys()
    const entry : EntryAPI = await sdk.space.getEntry(sys.id)
    const unpublishedReferencesEntries = await unpublishedReferences(entry, sdk)

    let title = "Publish entry?"
    let message = "This entry will be published and become available on your website or app."
    let confirmLabel = "Publish"

    if (unpublishedReferencesEntries.length > 0) {
      title = "You have unpublished links"
      message = "Not all links on this entry are published. See sections: " + unpublishedReferencesEntries.map(ref => ref.field).join(", ")
      confirmLabel = "Publish anyway"
    }

    const result = await sdk.dialogs.openConfirm({title, message, confirmLabel, cancelLabel: "Cancel" })
    if (!result) {
      return
    }
    const newEntry: any = await sdk.space.getEntry(sys.id);
    await sdk.space.publishEntry(newEntry);
    const newStatus = {
      reviewStatus: ReviewStatus.Published,
      level1Approval: Level1Approval.Blank,
      level2Approval: Level2Approval.Blank,
    }
    setWorkflowStatus(newStatus);
    await sdk.entry.fields.workflow.setValue(newStatus);
    sendEmailNotification();
    setPublicationStatus(PublicationStatus.Published);
    setLoading(false);
  }

  /**
   * When user ublublish content
   */
  const onClickUnpublish = async () => {
    setLoading(true);

    const sys = sdk.entry.getSys()

    const entry: any = await sdk.space.getEntry(sys.id)
    const linkedAndPublishedEntries = await getLinkedAndPublishedEntries(entry, sdk)

    let title = "Unpublish entry?"
    let message = "This entry will be unpublished and will not be available on your website or app anymore."
    let confirmLabel = "Unpublish"

    if (linkedAndPublishedEntries.length > 0) {
      title = "Entry is linked in other entries"
      confirmLabel = "Unpublish anyway"
      message = `There are ${linkedAndPublishedEntries.length} entries that link to this entry: ` +
        linkedAndPublishedEntries
          .map(getEntryDisplayFieldValue(entry, sdk, displayFieldsMap))
          .join(", ")
    }

    const result = await sdk.dialogs.openConfirm({ title, message, confirmLabel, cancelLabel: "Cancel" })

    if (!result) {
      return
    }
    const newStatus = {
      reviewStatus: ReviewStatus.Draft,
      level1Approval: Level1Approval.Blank,
      level2Approval: Level2Approval.Blank,
    }
    setWorkflowStatus(newStatus);
    await sdk.entry.fields.workflow.setValue(newStatus);
    const newEntry: any = await sdk.space.getEntry(sys.id);
    await sdk.space.unpublishEntry(newEntry);
    setPublicationStatus(PublicationStatus.Draft);
    setLoading(false);
  }
  
  return <>
    {/* *************************** */}
    {/* Request for Approval Button */}
    {/* *************************** */}
    <Paragraph className="f36-margin-bottom--s">
      Review Status: <strong style={{color: '#2e75d4'}}>{workflowStatus.reviewStatus}</strong>
    </Paragraph>
    {(roles.indexOf(AfnRole.Auhor) >= 0 || isAdmin) && <Button className="review-state-button" buttonType="positive" isFullWidth={false}
      onClick={() => {
        sdk.entry.fields.workflow.setValue({reviewStatus : ReviewStatus.RequestedForApproval, level1Approval: Level1Approval.Blank, level2Approval: Level2Approval.Blank}).then(() => {
          setWorkflowStatus({reviewStatus : ReviewStatus.RequestedForApproval, level1Approval: Level1Approval.Blank, level2Approval: Level2Approval.Blank});
        });
      }}
      disabled={workflowStatus.reviewStatus === ReviewStatus.RequestedForApproval || workflowStatus.reviewStatus === ReviewStatus.Approved || workflowStatus.reviewStatus === ReviewStatus.Published}
      loading={loading}>
      Request or Approval
    </Button> }
    <br />
    <br />

    {/* *************************** */}
    {/*       Level 1 Approval      */}
    {/* *************************** */}
    <Paragraph className="f36-margin-bottom--s">
      Editor Approval: <strong style={{color: '#2e75d4'}}>{workflowStatus.level1Approval}</strong>
    </Paragraph>
    {(roles.indexOf(AfnRole.Editor) >= 0 || roles.indexOf(AfnRole.ProductOwners) >= 0 || isAdmin) && <Button className="level1-approval-button" buttonType="positive" style={{marginRight: '10px'}} isFullWidth={false}
      onClick={() => {
        sdk.entry.fields.workflow.setValue({...workflowStatus, level1Approval: Level1Approval.Approved, level2Approval: Level2Approval.Blank}).then(() => {
          setWorkflowStatus({...workflowStatus, level1Approval: Level1Approval.Approved, level2Approval: Level2Approval.Blank});
        });
      }}
      disabled={workflowStatus.level1Approval === Level1Approval.Approved || workflowStatus.reviewStatus !== ReviewStatus.RequestedForApproval}
      loading={loading}>
      Approve
    </Button>}
    {(roles.indexOf(AfnRole.Editor) >= 0 || roles.indexOf(AfnRole.ProductOwners) >= 0 || isAdmin) && <Button className="level1-approval-button" buttonType="negative" isFullWidth={false}
      onClick={() => {
        sdk.entry.fields.workflow.setValue({reviewStatus: ReviewStatus.Rejected, level1Approval: Level1Approval.Deny, level2Approval : Level2Approval.Blank}).then(() => {
          setWorkflowStatus({reviewStatus: ReviewStatus.Rejected, level1Approval: Level1Approval.Deny, level2Approval : Level2Approval.Blank});
        });
      }}
      disabled={workflowStatus.level1Approval === Level1Approval.Deny || workflowStatus.reviewStatus !== ReviewStatus.RequestedForApproval}
      loading={loading}>
      Deny
    </Button>}
    <br />
    <br />

    {/* *************************** */}
    {/*       Level 2 Approval      */}
    {/* *************************** */}
    <Paragraph className="f36-margin-bottom--s">
      Product Owner Approval: <strong style={{color: '#2e75d4'}}>{workflowStatus.level2Approval}</strong>
    </Paragraph>
    {(roles.indexOf(AfnRole.ProductOwners) >= 0 || isAdmin) && <Button className="level2-approval-button" buttonType="positive" style={{marginRight: '10px'}} isFullWidth={false}
      onClick={() => {
        sdk.entry.fields.workflow.setValue({...workflowStatus, level2Approval: Level2Approval.Approved}).then(() => {
          setWorkflowStatus({...workflowStatus, level2Approval: Level2Approval.Approved});
        });
      }}
      disabled={workflowStatus.reviewStatus !== ReviewStatus.RequestedForApproval || workflowStatus.level1Approval !== Level1Approval.Approved || workflowStatus.level2Approval === Level2Approval.Approved}
      loading={loading}>
      Approve
    </Button>}
    {(roles.indexOf(AfnRole.ProductOwners) >= 0 || isAdmin) && <Button className="level2-approval-button" buttonType="negative" isFullWidth={false}
      onClick={() => {
        sdk.entry.fields.workflow.setValue({reviewStatus: ReviewStatus.Rejected, level1Approval: Level1Approval.Blank, level2Approval: Level2Approval.Deny}).then(() => {
          setWorkflowStatus({reviewStatus: ReviewStatus.Rejected, level1Approval: Level1Approval.Blank, level2Approval: Level2Approval.Deny});
        });
      }}
      disabled={workflowStatus.reviewStatus !== ReviewStatus.RequestedForApproval || workflowStatus.level1Approval !== Level1Approval.Approved || workflowStatus.level2Approval === Level2Approval.Deny}
      loading={loading}>
      Deny
    </Button>}
    <br />
    <br />

    {/* *************************** */}
    {/*        Publish Button       */}
    {/* *************************** */}
    <Paragraph className="f36-margin-bottom--s">
      Current Publication Status: <strong style={{color: '#2e75d4'}}>{publicationStatus}</strong>
    </Paragraph>
    <Button className="publish-button" buttonType="positive" isFullWidth={false} style={{marginRight: '10px'}}
      onClick={onClickPublish}
      disabled={publicationStatus === PublicationStatus.Published || loading || workflowStatus.reviewStatus !== ReviewStatus.RequestedForApproval || workflowStatus.level1Approval !== Level1Approval.Approved || workflowStatus.level2Approval !== Level2Approval.Approved}
      loading={loading} >
      Publish
    </Button>
    <Button className="publish-button" buttonType="negative" isFullWidth={false}
      onClick={onClickUnpublish}
      disabled={publicationStatus === PublicationStatus.Draft}
      loading={loading}>
      Unpublish
    </Button>
    <Paragraph>Last saved {relativeTime}</Paragraph>
  </>
};

export default Sidebar;
