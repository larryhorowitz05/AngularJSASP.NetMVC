﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MML.Common;
using MML.Web.LoanCenter.ViewModels;
using MML.Web.LoanCenter.Helpers.Utilities;
using MML.Contracts;
using MML.Web.Facade;
using MML.Web.LoanCenter.Helpers.Enums;
using MML.Common.Helpers;
using System.Web.WebPages.Html;

namespace MML.Web.LoanCenter.Commands
{
    public class PipelineGridSortingCommand : ICommand
    {
        private String _viewName = String.Empty;
        private dynamic _viewModel = null;
        private Dictionary<string, object> _inputParameters = null;
        private HttpContextBase _httpContext = null;

        public string ViewName
        {
            get { return _viewName; }
        }

        public dynamic ViewData
        {
            get { return _viewModel; }
        }

        public Dictionary<string, object> InputParameters
        {
            get
            {
                return _inputParameters;
            }
            set
            {
                _inputParameters = value;
            }
        }

        public HttpContextBase HttpContext
        {
            get { return _httpContext; }
            set { _httpContext = value; }
        }

        public void Execute()
        {
            String searchValue = CommonHelper.GetSearchValue( _httpContext );

            /* State retrieval */
            PipelineViewModel pipelineViewModel = null;
            if ( _httpContext.Session[ SessionHelper.PipelineViewModel ] != null )
                pipelineViewModel = new PipelineViewModel().FromXml( _httpContext.Session[ "PipelineViewModel" ].ToString() );
            else
                pipelineViewModel = new PipelineViewModel();

            PipelineListState pipelineListState = null;
            if ( _httpContext.Session[ SessionHelper.PipelineListState ] != null )
                pipelineListState = ( PipelineListState )_httpContext.Session[ "PipelineListState" ];
            else
                pipelineListState = new PipelineListState();

            UserAccount user = null;
            if (_httpContext.Session[SessionHelper.UserData] != null && ((UserAccount)_httpContext.Session[SessionHelper.UserData]).Username == _httpContext.User.Identity.Name)
                user = ( UserAccount )_httpContext.Session[ SessionHelper.UserData ];
            else
                user = UserAccountServiceFacade.GetUserByName( _httpContext.User.Identity.Name );

            if ( user == null )
                throw new InvalidOperationException( "User is null" );

            /* parameter processing */
            PipelineAttribute newSortColumn;
            if ( !InputParameters.ContainsKey( "Column" ) )
                throw new ArgumentException( "Column value was expected!" );
            else
                newSortColumn = ( PipelineAttribute )Enum.Parse( typeof( PipelineAttribute ), InputParameters[ "Column" ].ToString() );

            // switch direction
            if ( pipelineListState.SortColumn == newSortColumn && pipelineListState.SortDirection == "ASC" )
            {
                pipelineListState.SortDirection = "DESC";
            }
            else
                pipelineListState.SortDirection = "ASC";

            pipelineListState.SortColumn = newSortColumn;
            pipelineListState.CurrentPage = 1;

            /* Command processing */
            FilterViewModel userFilterViewModel = null;
            if ( ( _httpContext != null ) && ( _httpContext.Session[ SessionHelper.FilterViewModel ] != null ) )
            {
                userFilterViewModel = new FilterViewModel().FromXml( _httpContext.Session[ SessionHelper.FilterViewModel ].ToString() );

            }
            else
            {
                userFilterViewModel = new FilterViewModel();
            }
            var pipelineViewData = PipelineDataHelper.RetrievePipelineViewModel( pipelineListState,
                                                                                _httpContext.Session[ "UserAccountIds" ] !=
                                                                                null
                                                                                    ? ( List<int> )
                                                                                      _httpContext.Session[
                                                                                          "UserAccountIds" ]
                                                                                    : new List<int> { },
                                                                                user.UserAccountId, userFilterViewModel.CompanyId, userFilterViewModel.ChannelId, userFilterViewModel.DivisionId, userFilterViewModel.BranchId, searchValue );


            if ( pipelineViewModel != null )
            {
                pipelineViewModel.PipelineItems = pipelineViewData.PipelineItems;
                pipelineViewModel.PageCount = pipelineViewData.PageCount;
                pipelineViewModel.TotalItems = pipelineViewData.TotalItems;

                PipelineGridHelper.ProcessPagingOptions( pipelineListState, pipelineViewModel );
            }


            _viewName = "Queues/_pipeline";
            _viewModel = pipelineViewModel;

            /* Persist new state */
            _httpContext.Session[ SessionHelper.PipelineViewModel ] = pipelineViewModel.ToXml();
            _httpContext.Session[ SessionHelper.PipelineListState ] = pipelineListState;
        }
    }
}