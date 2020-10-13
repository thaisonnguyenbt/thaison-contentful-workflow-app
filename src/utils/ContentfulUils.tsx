
import { SidebarExtensionSDK, EntryAPI} from 'contentful-ui-extensions-sdk';

export const unpublishedReferences = (entry: EntryAPI, sdk: SidebarExtensionSDK) => {
  const referenceFieldNames: string[] = []
  const entryReferenceIds = []
  let locale = sdk.locales.default;
  for (const [name, value] of Object.entries(entry.fields)) {
    if (!!value && typeof value.getValue === 'function') {
      const localeValue = value.getValue(locale);
      if(!!localeValue){
        if (!!localeValue.sys && localeValue.sys.type === 'Link' && localeValue.sys.linkType === 'Entry') {
          referenceFieldNames.push(name);
          entryReferenceIds.push(localeValue.sys.id);
        }
      }
    }
  }

  return sdk.space
    .getEntries({
      "sys.id[in]": entryReferenceIds.join(",")
    })
    .then(referenceEntries => {
      return referenceEntries.items
        .filter(entry => {
          const newEntry = JSON.parse(JSON.stringify(entry));
          return !newEntry.sys || !newEntry.sys.publishedVersion;
        })
        .map((entry, ind) => ({
          field: referenceFieldNames[ind],
          entry
        }))
    })
}

export const getLinkedAndPublishedEntries = (entry: any, sdk: SidebarExtensionSDK) => {
  return sdk.space
    .getEntries({ links_to_entry: entry.sys.id })
    .then(linkedEntries =>
      linkedEntries.items.filter(entry => {
        const newEntry = JSON.parse(JSON.stringify(entry));
        return !!newEntry.sys && !!newEntry.sys.publishedVersion;
      })
    )
}

export const getEntryDisplayFieldValue = (entry: any, sdk: SidebarExtensionSDK, displayFieldsMap : any) => {
  
  const id = entry.sys.contentType.sys.id;
  const defaultLocale = sdk.locales.default;
  const newEntry = JSON.parse(JSON.stringify(entry))
  return newEntry.fields[displayFieldsMap[id]][defaultLocale];
}

export const sendEmailNotification = () => {
  fetch('https://zirlklpm86.execute-api.ap-southeast-1.amazonaws.com/dev/users/create',{
    mode: 'no-cors',
  })
}

export const relativeDate = (previous: number) => {

  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = new Date().getTime() - previous;

  if (elapsed < msPerMinute) {
       return Math.round(elapsed/1000) + ' seconds ago';   
  }

  else if (elapsed < msPerHour) {
       return Math.round(elapsed/msPerMinute) + ' minutes ago';   
  }

  else if (elapsed < msPerDay ) {
       return Math.round(elapsed/msPerHour ) + ' hours ago';   
  }

  else if (elapsed < msPerMonth) {
      return 'approximately ' + Math.round(elapsed/msPerDay) + ' days ago';   
  }

  else if (elapsed < msPerYear) {
      return 'approximately ' + Math.round(elapsed/msPerMonth) + ' months ago';   
  }

  else {
      return 'approximately ' + Math.round(elapsed/msPerYear ) + ' years ago';   
  }
}