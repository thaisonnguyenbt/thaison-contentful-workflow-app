export enum AfnRole {
  ProductOwners = "Product Owners",
  Auhor = "Author", 
  Editor = "Editor", 
}

export enum ReviewStatus {
  Draft = "Draft",
  Changed = "Changed",
  RequestedForApproval = "Requested For Approval",
  Rejected = "Rejected",
  Approved = "Approved",
  Published = "Published"
}

export enum Level1Approval {
  Blank = "N/A",
  Approved = "Approved",
  Deny = "Denied"
}

export enum Level2Approval {
  Blank = "N/A",
  Approved = "Approved",
  Deny = "Denied"
}

export enum PublicationStatus {
  Draft = "Draft", 
  Changed = "Changed",
  Published = "Published"
}