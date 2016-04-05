﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using MML.Common;
using MML.Web.LoanCenter.ViewModels;
using MML.Web.Facade;
using MML.Contracts;
using MML.Common.Helpers;
using MML.Web.LoanCenter.Helpers.Utilities;

namespace MML.Web.LoanCenter.Commands
{
    public class TaskGridPagingCommand : ICommand
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
            /* State retrieval */
            OfficerTasksViewModel taskViewModel = null;
            if (_httpContext.Session["OfficerTaskViewModel"] != null)
                taskViewModel = new OfficerTasksViewModel().FromXml(_httpContext.Session["OfficerTaskViewModel"].ToString());
            else
                taskViewModel = new OfficerTasksViewModel();

            OfficerTaskListState taskListState = null;
            if (_httpContext.Session["OfficerTaskListState"] != null)
                taskListState = (OfficerTaskListState)_httpContext.Session["OfficerTaskListState"];
            else
                taskListState = new OfficerTaskListState();

            UserAccount user = null;
            if (_httpContext.Session[SessionHelper.UserData] != null && ((UserAccount)_httpContext.Session[SessionHelper.UserData]).Username == _httpContext.User.Identity.Name)
                user = (UserAccount)_httpContext.Session[ SessionHelper.UserData ];
            else
                user = UserAccountServiceFacade.GetUserByName(_httpContext.User.Identity.Name);
            
            if (user == null) 
                throw new InvalidOperationException("User is null");

            /* parameter processing */ 
            Int32 newPageNumber = 0;
            if (!InputParameters.ContainsKey("Page"))
                throw new ArgumentException("Page number was expected!");
            else
                newPageNumber = Convert.ToInt32(InputParameters["Page"]);

            taskListState.CurrentPage = newPageNumber;

            /* Command processing */
            var result = TaskServiceFacade.GetTasks( _httpContext.Session[ SessionHelper.UserAccountIds ] != null ? ( List<int> )_httpContext.Session[ SessionHelper.UserAccountIds ] : new List<int> { },
                                                    taskListState.BoundDate,
                                                    taskListState.CurrentPage,
                                                    EnumHelper.GetStringValue(taskListState.SortColumn),
                                                    taskListState.SortDirection,
                                                    user.UserAccountId
                                                    );

            if (result != null)
            {
                taskViewModel.OfficerTasks = result.OfficerTasks;
                taskViewModel.PageCount = result.TotalPages;
                taskViewModel.TotalItems = result.TotalItems;
            }

            OfficerTaskGridHelper.ProcessPagingOptions(taskListState, taskViewModel);

            OfficerTaskGridHelper.ApplyClassCollection(taskViewModel);

            _viewName = "_officertask";
            _viewModel = taskViewModel;
            
            /* Persist new state */
            _httpContext.Session["OfficerTaskViewModel"] = taskViewModel.ToXml();
            _httpContext.Session["OfficerTaskListState"] = taskListState;
        }
    }
}