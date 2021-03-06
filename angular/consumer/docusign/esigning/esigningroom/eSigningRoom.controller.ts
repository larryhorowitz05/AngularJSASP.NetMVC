﻿/// <reference path="../../../../../scripts/typings/angularjs/angular.d.ts" />
/// <reference path='../../../../../Scripts/typings/ui-router/angular-ui-router.d.ts'/>
/// <reference path="../../../consumer.service.ts" />

module docusign {

    export class ESigningRoomController {

        private successController: SuccessController;

        static className = 'ESigningRoomController';

        public static $inject = [
            '$window',
            '$state',
            'docusignSVC',
            '$sce',
            '$timeout',
            'authenticationContext',
            'loanViewModel',
            '$controller'
        ];

        //Properties
        iframeSrc: string;
        iFrameHeight: number;
        showESigningRoomIFrame: boolean = true;
        showSuccessRegion: boolean = false;
        showCoBorrowerRequiredRegion: boolean = false;
        showDeclineRegion: boolean = false;
        showRestartRegion: boolean = false;

        startOverMessage: string = "";

        constructor(
            private $window: ng.IWindowService,
            private $state: ng.ui.IStateService,
            private docusignSVC: IDocusignService,
            private $sce: ng.ISCEService,
            private $timeout: ng.ITimeoutService,
            private authenticationContext: cls.SecureLinkAuthenticationViewModel,
            private loanViewModel: cls.LoanViewModel,
            private $controller: ng.IControllerService)
        {
            this.successController = $controller('SuccessController');

            if (docusignSVC.docusignSigningRoom != null) {
                this.setIFrameUrl(docusignSVC.docusignSigningRoom.Url);
                //set callback in the global namespace so it is easier to connect with from child iFrame
                $window["SecureLinkDocusignComplete"] = (message: any) => {
                    this.finishedSigningHandler(message);
                }
            } else {
                this.docusignSVC.log("No docusign Url was set.", "error");
                this.showESigningRoomIFrame = false;
                this.startOverMessage = "You're signing session was lost.  Please restart the signing process by clicking the Restart button below.";
                this.showRegion("showRestartRegion");
                //this.$timeout(() => {
                //    this.showRestartRegion = true;
                //}, 0);
            }

            //Test code
            //this.setIFrameUrl("https://angularjs.org/");
            //this.setIFrameUrl("https://demo.docusign.net/restapi/v2/accounts/1019994");
            //this.setIFrameUrl("https://demo.docusign.net/Signing/startinsession.aspx?t=2d16a4cb-7ebd-4717-99b6-560c14c6bffa");
            //this.setIFrameUrl("https://demo.docusign.net/Signing/startinsession.aspx?t=25521dd9-0ee7-465d-9e54-4f5eb4a4cce2");
            //this.setIFrameUrl("https://demo.docusign.net/Signing/startinsession.aspx?t=1c6e4009-3ff6-42fa-97f0-8289dcb6d70d");
            //this.setIFrameHeight($window);
            //this.setIFrameUrl("https://demo.docusign.net/Signing/startinsession.aspx?t=a259cd66-d307-4ca3-b67b-c82cdadb1b9d");
            ////set callback in the global namespace so it is easier to connect with
            //$window["SecureLinkDocusignComplete"] = (message: any) => {
            //    this.finishedSigningHandler(message);
            //}
            //this.docusignSVC.log(this.iframeSrc);
        }

        private setIFrameUrl = (url: string) => {
            var trustedUrl = this.$sce.trustAsResourceUrl(url);
            this.iframeSrc = trustedUrl;
            this.docusignSVC.log('iframe url set to ' + trustedUrl);
        }

        public finishedSigningHandler = (event: any) => {
            this.docusignSVC.log('finishedSigningHandler() called with event "' + event + '".');

            //Hide the iFrame by all accounts
            this.showESigningRoomIFrame = false;

            //Different Docusign Events
            //event = signing_complete  -this happens even if the first of two borrowers signed.
            //event = decline           -if this happens we have to void everything if anything was saved.
            //event = ttl_expired       -if the signing session was interrupted for any reason
            //event = viewing_complete  - when a borrower comes in to view the signing room that he already signed and clicks "Close".
            if (event != null) {
                switch (event) {
                    case 'signing_complete':
                    case 'viewing_complete':
                        //This is the good one.  Call the handler to get the signed documents if both have now signed.
                        this.showRegion("showSuccessRegion");
                        //this.$timeout(() => {
                        //    this.showSuccessRegion = true;
                        //}, 0);
                        var data = this.authenticationContext;
                        var envelopeId = this.docusignSVC.docusignSigningRoom.EnvelopeId;
                        this.docusignSVC.post('securelink/HandleSigningComplete?EnvelopeId=' + envelopeId, data).then((response: any) => {
                            if (response.ErrorMsg != null) {
                                this.showSuccessRegion = false;
                                this.startOverMessage = "There was an unexpected error.  Please restart the signing process by clicking the Restart button below.  If the problem persists please contact your loan officer.";
                                this.showRegion("showRestartRegion");
                            } else {
                                var message = response.Response;
                                if (message != null) {
                                    if (message.ErrorCode === 1) {
                                        //This will alert the message that all signers have not signed
                                        //alert(message.Message);
                                        this.showSuccessRegion = false;
                                        this.showRegion("showCoBorrowerRequiredRegion");
                                        //this.$timeout(() => {
                                        //    this.showCoBorrowerRequiredRegion = true;
                                        //}, 0);
                                    } else {
                                    

                                        if (message.ActionTaken === true) {
                                            //If action was taken on the server then reload the viewmodel and go to the appraisal screen
                                            this.docusignSVC.refreshLoanViewModel().then(() => {
                                                this.openSuccessController();
                                                this.$state.go('docusign.appraisal');
                                            });
                                        } else {
                                            //Otherwise just go to the appraisal screen
                                            this.$state.go('docusign.appraisal');
                                        }
                                    }
                                }
                            }
                        });
                        break;
                    //case 'viewing_complete':
                    //    //Move on to the next step
                    //    if (this.docusignSVC.isESigningComplete) {
                    //        this.$state.go('docusign.appraisal');
                    //    } else {
                    //        this.showRegion("showCoBorrowerRequiredRegion");
                    //        //this.$timeout(() => {
                    //        //    this.showCoBorrowerRequiredRegion = true;
                    //        //}, 0);
                    //    }
                    //    break;
                    case 'decline':
                        this.showRegion("showDeclineRegion");
                        //this.$timeout(() => {
                        //    this.showDeclineRegion = true;
                        //}, 0);
                        var data = this.authenticationContext;
                        var envelopeId = this.docusignSVC.docusignSigningRoom.EnvelopeId;
                        this.docusignSVC.post('securelink/HandleSigningComplete?EnvelopeId=' + envelopeId, data).then((response: any) => {
                            var message = response.Response;
                        });
                        //TODO need to reflect in the system that the signer rejected the document
                        //alert('Sorry, you cannot continue until you have signed your documents.  Please Navigate back to the Sign Disclosures page.');
                        break;
                    case 'ttl_expired':
                        this.startOverMessage = "Your document has expired.  Please restart the signing process by clicking the Restart button below.";
                        this.showRegion("showRestartRegion");
                        //this.$timeout(() => {
                        //    this.showRestartRegion = true;
                        //}, 0);
                        //Go back to the ESigningInstructions screen
                        //alert('Your document has expired.  Please restart the signing process by clicking the Sign Disclosures button above.');
                        //this.$state.go('docusign.esign.instructions');
                        break;
                    case 'cancel':
                        this.startOverMessage = "You have cancelled out of the signing room.  Please restart the signing process by clicking the Restart button below.";
                        this.showRegion("showRestartRegion");
                        //this.$timeout(() => {
                        //    this.showRestartRegion = true;
                        //}, 0);
                        //Go back to the ESigningInstructions screen
                        //alert('You have cancelled out of the signing room.  Please restart the signing process by clicking the restart button above.');
                        //this.$state.go('docusign.esign.instructions');
                        break;
                }
            }

        }

        private showRegion = (regionName: string) => {
            this.$timeout(() => {
                this[regionName] = true;
            }, 0);
        }

        public restart = () => {
            //Restart the signing room by navigating back to instructions screen
            this.$state.go('docusign.esign.instructions');
        }

        public finish = () => {
            //TODO: Go to the needs list if appraisal already complete
            this.$state.go('docusign.appraisal');
        }

        private openSuccessController = () => {
            var templateURL = '/angular/consumer/docusign/esigning/confirmation/success.esigning.html';
            this.successController.openSuccessPopUp(templateURL);
        }
    }

    angular.module('docusign').controller('ESigningRoomController', ESigningRoomController);
}