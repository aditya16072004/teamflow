import { supabase } from "./lib/supabase";
import Auth from "./Auth";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  CalendarDays,
  Settings,
  Plus,
  Search,
  Clock,
  CircleCheck,
  ListTodo,
  ArrowUpRight,
  X,
  Pencil,
  Trash2,
  LogOut,
  Camera,
  UserRound,
  KanbanSquare, MessageCircle, History, Bell, Moon, Sun,
} from "lucide-react";
const emptyForm = {
  title: "",
  description: "",
  team: "Development",
  priority: "Medium",
  status: "To Do",
  dueDate: "",
  teamId: "",
  assignedTo: "",
};
const mapTask = (task) => ({
  id: task.id,
  userId: task.user_id,
  title: task.title,
  description: task.description || "",
  team: task.team || "Development",
  teamId: task.team_id || "",
  assignedTo: task.assigned_to || "",
  priority: task.priority || "Medium",
  status: task.status || "To Do",
  dueDate: task.due_date || "",
});
function Dashboard({ onLogout, session }) {
  const [tasks, setTasks] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("teamflow-dark") === "true");
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [collabError, setCollabError] = useState("");
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [statusBusy, setStatusBusy] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => localStorage.getItem("teamflow-activity-seen") || new Date().toISOString());

  const [tasksLoading, setTasksLoading] = useState(true);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [memberError, setMemberError] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [taskScope, setTaskScope] = useState("all");
  const [activeView, setActiveView] = useState("Dashboard");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamError, setTeamError] = useState("");
  const [isTeamsModalOpen, setIsTeamsModalOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [inviteTeamId, setInviteTeamId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [invitationNotice, setInvitationNotice] = useState("");
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationError, setInvitationError] = useState("");
  const [acceptingInvitationId, setAcceptingInvitationId] = useState(null);
  const [teamsRefreshKey, setTeamsRefreshKey] = useState(0);
  useEffect(() => { localStorage.setItem("teamflow-dark", String(darkMode)); }, [darkMode]);
  const userId = session.user.id;
  const userEmail = session.user.email?.trim().toLowerCase() || "";
  const [profileUser, setProfileUser] = useState(session.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const profileName = String(profileUser.user_metadata?.full_name || profileUser.user_metadata?.name || "").trim();
  const displayName = profileName || profileUser.email?.split("@")[0] || "User";
  const profileInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    let active = true;
    async function loadProfilePhoto() {
      const path = profileUser.user_metadata?.avatar_path;
      if (!path) { setProfilePhotoUrl(""); return; }
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (active) {
        setProfilePhotoUrl(error ? "" : data?.signedUrl || "");
        if (error) setProfileError(`Could not load profile photo: ${error.message}`);
      }
    }
    loadProfilePhoto();
    return () => { active = false; };
  }, [profileUser.user_metadata?.avatar_path]);

  const saveProfileName = async (event) => {
    event.preventDefault();
    const fullName = profileNameInput.trim();
    if (!fullName) { setProfileError("Please enter your name."); return; }
    setProfileBusy(true);
    setProfileError("");
    setProfileNotice("");
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName, name: fullName } });
    if (error) setProfileError(`Could not save name: ${error.message}`);
    else {
      setProfileUser(data.user);
      setEditingName(false);
      setProfileNotice("Name updated successfully.");
    }
    setProfileBusy(false);
  };

  const uploadProfilePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Choose a JPG, PNG or WebP image."); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Profile photos must be 2 MB or smaller."); return;
    }
    setProfileBusy(true);
    setProfileError("");
    setProfileNotice("");
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data, error: updateError } = await supabase.auth.updateUser({ data: { avatar_path: path } });
      if (updateError) throw updateError;
      setProfileUser(data.user);
      setProfileNotice("Profile photo updated successfully.");
    } catch (error) {
      setProfileError(`Could not upload photo: ${error.message}`);
    } finally { setProfileBusy(false); }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadTasks() {
      setTasksLoading(true);
      setTaskError("");
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        setTaskError(`Could not load tasks: ${error.message}`);
      } else {
        setTasks((data || []).map(mapTask));
      }
      setTasksLoading(false);
    }
    loadTasks();
    return () => {
      isMounted = false;
    };
  }, [userId, tasksRefreshKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      setTeamsLoading(true);
      setTeamError("");
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, description, owner_id, created_at")
        .order("created_at", { ascending: false });

      if (!isMounted) return;
      if (error) {
        setTeamError(`Could not load teams: ${error.message}`);
      } else {
        setTeams(data || []);
      }
      setTeamsLoading(false);
    }

    loadTeams();
    return () => {
      isMounted = false;
    };
  }, [userId, teamsRefreshKey]);

  useEffect(() => {
    let active = true;
    async function loadMembers() {
      setMembersLoading(true);
      setMemberError("");
      if (!teams.length) {
        setTeamMembers([]);
        setMembersLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("team_members")
        .select("team_id, user_id, role")
        .in("team_id", teams.map((team) => team.id));
      if (!active) return;
      if (error) setMemberError(`Could not load team members: ${error.message}`);
      else setTeamMembers(data || []);
      setMembersLoading(false);
    }
    loadMembers();
    return () => { active = false; };
  }, [teams]);

  useEffect(() => {
    let active = true;
    async function loadInvitations() {
      setInvitationsLoading(true);
      setInvitationError("");
      if (!userEmail) {
        if (active) {
          setPendingInvitations([]);
          setInvitationsLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("team_invitations")
        .select("id, team_id, email, status, expires_at, created_at")
        .eq("email", userEmail)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setInvitationError(`Could not load invitations: ${error.message}`);
      } else {
        setPendingInvitations(data || []);
      }
      setInvitationsLoading(false);
    }
    loadInvitations();
    return () => { active = false; };
  }, [userEmail]);

  const refreshActivity = async () => {
    setActivityLoading(true);
    const { data, error } = await supabase.from("task_activity")
      .select("id,task_id,actor_id,action,details,created_at")
      .order("created_at", { ascending: false }).limit(80);
    if (error) setCollabError(`Activity: ${error.message}`);
    else setActivity(data || []);
    setActivityLoading(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("task_activity")
        .select("id,task_id,actor_id,action,details,created_at")
        .order("created_at", { ascending: false }).limit(80);
      if (active && data) setActivity(data);
    };
    load();
    return () => { active = false; };
  }, [userId, tasksRefreshKey]);

  useEffect(() => {
    const channel = supabase.channel(`teamflow-live-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" },
        () => setTasksRefreshKey((key) => key + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" },
        () => setCommentsRefreshKey((key) => key + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_activity" },
        () => setActivityRefreshKey((key) => key + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const [commentsRefreshKey, setCommentsRefreshKey] = useState(0);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  useEffect(() => {
    if (activityRefreshKey) refreshActivity();
  }, [activityRefreshKey]);

  useEffect(() => {
    if (!selectedTask) { setComments([]); return; }
    let active = true;
    setCommentsLoading(true);
    supabase.from("task_comments").select("id,task_id,user_id,body,created_at")
      .eq("task_id", selectedTask.id).order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setCollabError(`Comments: ${error.message}`);
        else setComments(data || []);
        setCommentsLoading(false);
      });
    return () => { active = false; };
  }, [selectedTask?.id, commentsRefreshKey]);

  const submitComment = async (event) => {
    event.preventDefault();
    if (!selectedTask || !commentText.trim()) return;
    setCommentBusy(true); setCollabError("");
    const { error } = await supabase.from("task_comments").insert({
      task_id: selectedTask.id, user_id: userId, body: commentText.trim()
    });
    if (error) setCollabError(error.message);
    else { setCommentText(""); setCommentsRefreshKey((key) => key + 1); }
    setCommentBusy(false);
  };

  const updateTaskStatus = async (task, status) => {
    if (!task || task.status === status) return;
    if (!canManageTask(task)) {
      setTaskError("Only the task creator or team owner can move this task."); return;
    }
    setStatusBusy(task.id); setTaskError("");
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) setTaskError(`Could not move task: ${error.message}`);
    else {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
      setTasksRefreshKey((key) => key + 1);
    }
    setStatusBusy(null);
  };

  const unseenCount = activity.filter((item) => item.actor_id !== userId && item.created_at > lastSeen).length;
  const openNotifications = () => {
    setNotificationsOpen(true);
    const now = new Date().toISOString();
    setLastSeen(now); localStorage.setItem("teamflow-activity-seen", now);
  };

  const handleAcceptInvitation = async (invitation) => {
    setAcceptingInvitationId(invitation.id);
    setInvitationError("");
    setInvitationNotice("");
    try {
      const { error } = await supabase.rpc("accept_team_invitation", {
        invitation_id: invitation.id,
      });
      if (error) throw error;
      setPendingInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setInvitationNotice("Invitation accepted! You are now a team member.");
      setTeamsRefreshKey((key) => key + 1);
      setTasksRefreshKey((key) => key + 1);
    } catch (error) {
      setInvitationError(`Could not accept invitation: ${error.message}`);
    } finally {
      setAcceptingInvitationId(null);
    }
  };

  const handleRefreshInvitations = async () => {
    setInvitationsLoading(true);
    setInvitationError("");
    const { data, error } = await supabase
      .from("team_invitations")
      .select("id, team_id, email, status, expires_at, created_at")
      .eq("email", userEmail)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) setInvitationError(`Could not refresh invitations: ${error.message}`);
    else setPendingInvitations(data || []);
    setInvitationsLoading(false);
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    const cleanName = teamName.trim();
    if (!cleanName) return;

    setCreatingTeam(true);
    setTeamError("");

    try {
      const { data: newTeam, error: createError } = await supabase
        .from("teams")
        .insert({
          name: cleanName,
          description: teamDescription.trim(),
          owner_id: userId,
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: newTeam.id,
          user_id: userId,
          role: "owner",
        });

      if (memberError) {
        setTeams((current) => [newTeam, ...current]);
        throw new Error(
          `The team was created, but adding you as its owner-member failed: ${memberError.message}`
        );
      }

      setTeams((current) => [newTeam, ...current]);
      setTeamMembers((current) => [...current, { team_id: newTeam.id, user_id: userId, role: "owner" }]);
      setTeamName("");
      setTeamDescription("");
      setIsCreateTeamOpen(false);
    } catch (error) {
      setTeamError(error.message || "Could not create team.");
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateInvitation = async (event, team) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || team.owner_id !== userId) return;

    setCreatingInvitation(true);
    setTeamError("");
    setInvitationNotice("");
    try {
      // Save first: the Edge Function checks the invitation ID and ownership.
      const { data: invitation, error: insertError } = await supabase
        .from("team_invitations")
        .insert({ team_id: team.id, email, invited_by: userId })
        .select("id")
        .single();
      if (insertError) throw insertError;

      // Email delivery is separate from saving the invitation.
      // A failed send must not be presented as a failed invitation creation.
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        "send-team-invitation",
        { body: { invitationId: invitation.id } }
      );

      if (sendError || !sendResult?.success) {
        let details = sendResult?.error || sendError?.message || "Unknown email error";
        if (sendError?.context && typeof sendError.context.json === "function") {
          try {
            const payload = await sendError.context.json();
            details = payload?.error || details;
          } catch {
            // Keep the original error if the response body is unavailable.
          }
        }
        setTeamError(
          `Invitation saved for ${email}, but the email could not be sent: ${details}. ` +
          "The recipient can still sign in and accept it under Teams."
        );
      } else {
        setInvitationNotice(
          `Invitation saved and email submitted to ${email}. ` +
          "The recipient can sign in and accept it under Teams."
        );
      }
      setInviteEmail("");
      setInviteTeamId(null);
    } catch (error) {
      setTeamError(`Could not create invitation: ${error.message}`);
    } finally {
      setCreatingInvitation(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const filteredTasks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return tasks.filter((task) => {
      if (taskScope === "personal" && task.teamId) return false;
      if (taskScope !== "all" && taskScope !== "personal" && task.teamId !== taskScope) return false;
      return !search || [task.title, task.description, task.team, task.priority, task.status]
        .some((value) => String(value || "").toLowerCase().includes(search));
    });
  }, [tasks, searchTerm, taskScope]);
  const canManageTask = (task) =>
    task.userId === userId ||
    (task.teamId && teams.some((team) => team.id === task.teamId && team.owner_id === userId));
  const visibleTasks = activeView === "My Tasks" ? filteredTasks.filter((task) => task.userId === userId || task.assignedTo === userId) : filteredTasks;
  const stats = [
    {
      title: "Total Tasks",
      value: visibleTasks.length,
      icon: ListTodo,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "To Do",
      value: visibleTasks.filter((task) => task.status === "To Do").length,
      icon: Clock,
      color: "bg-orange-50 text-orange-600",
    },
    {
      title: "In Progress",
      value: visibleTasks.filter((task) => task.status === "In Progress").length,
      icon: CheckSquare,
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Completed",
      value: visibleTasks.filter((task) => task.status === "Completed").length,
      icon: CircleCheck,
      color: "bg-green-50 text-green-600",
    },
  ];
  const calendarTasks = visibleTasks.filter((task) => task.dueDate?.startsWith(calendarMonth)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };
  const handleSaveTask = async (event) => {
    event.preventDefault();
    const taskDetails = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      team: formData.teamId ? (teams.find((team) => team.id === formData.teamId)?.name || "Team") : formData.team,
      priority: formData.priority,
      status: formData.status,
      due_date: formData.dueDate || null,
      assigned_to: formData.teamId ? (formData.assignedTo || null) : null,
    };
    if (!taskDetails.title) return;
    setSavingTask(true);
    setTaskError("");
    try {
      if (editingTaskId !== null) {
        const existingTask = tasks.find((task) => task.id === editingTaskId);
        if (!existingTask || !canManageTask(existingTask)) throw new Error("You cannot edit this task.");
        const { data, error } = await supabase
          .from("tasks")
          .update(taskDetails)
          .eq("id", editingTaskId)
          .select()
          .single();

        if (error) throw error;

        setTasks((current) => current.map((task) =>
          task.id === editingTaskId ? mapTask(data) : task
        ));
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            ...taskDetails,
            team_id: formData.teamId || null,
            user_id: userId,
          })
          .select()
          .single();

        if (error) throw error;

        setTasks((current) => [mapTask(data), ...current]);
      }

      closeModal();
      setSearchTerm("");
    } catch (error) {
      setTaskError(`Could not save task: ${error.message}`);
    } finally {
      setSavingTask(false);
    }
  };
  const openCreateModal = () => {
    setEditingTaskId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };
  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setFormData({
      title: task.title,
      description: task.description,
      team: task.team,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate || "",
      teamId: task.teamId || "",
      assignedTo: task.assignedTo || "",
    });
    setIsModalOpen(true);
  };
  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;
    if (!canManageTask(task)) {
      setTaskError("You cannot delete this task.");
      return;
    }

    setTaskError("");

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      setTaskError(`Could not delete task: ${error.message}`);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== task.id));
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTaskId(null);
    setFormData(emptyForm);
  };
  const formatDate = (date) => {
    if (!date) return "Not set";
    return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  return (
    <div className={`teamflow-shell min-h-screen bg-slate-50 md:flex ${darkMode ? "tf-dark" : ""}`}>
      {/* Sidebar */}
      <aside className="w-full border-r border-slate-200 bg-white md:min-h-screen md:w-64">
        <div className="border-b border-slate-100 p-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-600">
            TeamFlow<span className="text-slate-900">.</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">Manage work together</p>
        </div>
        <nav className="space-y-2 p-4">
          {[
            { name: "Dashboard", icon: LayoutDashboard },
            { name: "My Tasks", icon: CheckSquare },
            { name: "Kanban", icon: KanbanSquare },
            { name: "Activity", icon: History },
            { name: "Teams", icon: Users },
            { name: "Calendar", icon: CalendarDays },
            { name: "Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  if (item.name === "Teams") {
                    setTeamError("");
                    setIsTeamsModalOpen(true);
                  } else {
                    setActiveView(item.name);
                    setSearchTerm("");
                    setTaskScope("all");
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  activeView === item.name
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={19} />
                {item.name}
              </button>
            );
          })}
        </nav>
        <div className="mx-4 mt-8 rounded-2xl bg-blue-600 p-5 text-white">
          <p className="text-sm font-semibold">TeamFlow Pro</p>
          <p className="mt-2 text-xs leading-5 text-blue-100">
            Keep your team organized and productive.
          </p>

        </div>
      </aside>
      {/* Main Dashboard */}
      <main className="min-w-0 flex-1 p-5 md:p-8">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{activeView}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeView === "My Tasks" ? "Tasks you created or are assigned to." : activeView === "Calendar" ? "Upcoming deadlines for accessible tasks." : activeView === "Settings" ? "Your account details." : "Welcome back! Here's your team's overview."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={openNotifications} aria-label="Notifications" title="Notifications"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600">
              <Bell size={18}/>{unseenCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{unseenCount > 9 ? "9+" : unseenCount}</span>}
            </button>
            <button type="button" onClick={() => setDarkMode((current) => !current)} aria-label="Toggle dark mode"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>
        {collabError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{collabError}</p>}
        {activeView === "Kanban" && (
          <section className="mb-6">
            <p className="mb-4 text-sm text-slate-500">Drag tasks between columns to update their status. Task creators and team owners can move cards.</p>
            {taskError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{taskError}</p>}
            <div className="grid gap-4 lg:grid-cols-3">
              {["To Do", "In Progress", "Completed"].map((status) => (
                <div key={status} onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); updateTaskStatus(tasks.find((task) => task.id === draggingTask), status); setDraggingTask(null); }}
                  className="min-h-72 rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-4 font-bold text-slate-800">{status} <span className="text-slate-400">({filteredTasks.filter((task) => task.status === status).length})</span></h3>
                  <div className="space-y-3">
                    {filteredTasks.filter((task) => task.status === status).map((task) => (
                      <article key={task.id} draggable={!!canManageTask(task) && !statusBusy}
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggingTask(task.id); }}
                        onDragEnd={() => setDraggingTask(null)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <p className="font-semibold text-slate-800">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{task.priority} priority · {task.dueDate || "No due date"}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button type="button" onClick={() => { setSelectedTask(task); setCollabError(""); }} className="text-xs font-semibold text-blue-600">Comments</button>
                          <select aria-label={`Status for ${task.title}`} value={task.status} disabled={!canManageTask(task) || !!statusBusy}
                            onChange={(event) => updateTaskStatus(task, event.target.value)} className="max-w-32 rounded-lg border p-1 text-xs">
                            {["To Do", "In Progress", "Completed"].map((value) => <option key={value} value={value}>{value}</option>)}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        {activeView === "Activity" && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Task activity</h3><button type="button" onClick={refreshActivity} className="text-sm text-blue-600">Refresh</button></div>
            {activityLoading ? <p>Loading activity...</p> : activity.length ? (
              <div className="space-y-3">{activity.map((item) => (
                <div key={item.id} className="border-b border-slate-100 pb-3 text-sm">
                  <p className="font-medium text-slate-800">{item.details?.title || "Task"} — {item.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()} · {item.actor_id === userId ? "You" : "Team member"}</p>
                </div>
              ))}</div>
            ) : <p className="text-sm text-slate-500">No activity yet.</p>}
          </section>
        )}
        {activeView === "Settings" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900">Account</h3>
            <p className="mt-3 text-sm text-slate-600">Signed in as <span className="font-medium">{userEmail}</span></p>
            <p className="mt-2 text-xs text-slate-500">Account ID: {userId}</p>
            <p className="mt-5 text-sm text-slate-500">Task permissions and team memberships are managed through Supabase.</p>
          </section>
        ) : activeView === "Kanban" || activeView === "Activity" ? null : <>
        {/* Search and Actions */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              type="search"
              aria-label="Search tasks"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-40 text-sm outline-none sm:w-64"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create Task
            </button>
            <button type="button" onClick={() => { setProfileOpen(true); setProfileError(""); setProfileNotice(""); }}
              aria-label="Open your profile" title={displayName}
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-blue-600 text-lg font-bold text-white shadow-sm hover:ring-4 hover:ring-blue-100">
              {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Your profile" className="h-full w-full object-cover" /> : profileInitial}
            </button>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label htmlFor="task-scope" className="text-sm font-medium text-slate-600">Show tasks:</label>
          <select id="task-scope" value={taskScope} onChange={(event) => setTaskScope(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="all">All accessible tasks</option>
            <option value="personal">Personal tasks</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
          <button type="button" onClick={() => setTasksRefreshKey((key) => key + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600">Refresh tasks</button>
        </div>
        {activeView === "Calendar" && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">Task deadlines</h3>
              <label className="flex items-center gap-2 text-sm text-slate-600">Month
                <input type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2" />
              </label>
            </div>
            {calendarTasks.length ? <div className="space-y-2">{calendarTasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
                <div><p className="text-sm font-semibold text-slate-800">{task.title}</p><p className="text-xs text-slate-500">{task.status} · {task.priority} priority</p></div>
                <span className="text-sm font-medium text-blue-700">{formatDate(task.dueDate)}</span>
              </div>
            ))}</div> : <p className="text-sm text-slate-500">No task deadlines this month.</p>}
          </section>
        )}
        {/* Statistics */}
        <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {stat.title}
                  </p>
                  <div className={`rounded-xl p-3 ${stat.color}`}>
                    <Icon size={21} />
                  </div>
                </div>
                <h3 className="mt-5 text-3xl font-bold text-slate-900">
                  {String(stat.value).padStart(2, "0")}
                </h3>
                <p className="mt-2 text-xs text-slate-400">
                  Updated from your task list
                </p>
              </div>
            );
          })}
        </section>
        {/* Recent Tasks */}
        {taskError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {taskError}
          </p>
        )}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h3 className="font-bold text-slate-900">Recent Tasks</h3>
              <p className="mt-1 text-sm text-slate-400">
                {searchTerm
                  ? `${visibleTasks.length} result(s) for "${searchTerm}"`
                  : "Track your personal and shared team tasks."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              Clear search <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">Task name</th>
                  <th className="p-4">Team</th>
                  <th className="p-4">Assigned to</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Due date</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasksLoading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-sm text-slate-400">
                      Loading your tasks...
                    </td>
                  </tr>
                ) : visibleTasks.length > 0 ? (
                  visibleTasks.map((task) => (
                    <tr key={task.id} className="border-t border-slate-100">
                      <td className="p-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-500">{teams.find((team) => team.id === task.teamId)?.name || (task.teamId ? "Team task" : `Personal · ${task.team}`)}</td>
                      <td className="p-4 text-xs text-slate-500">{task.assignedTo ? (task.assignedTo === userId ? "You" : `${task.assignedTo.slice(0, 8)}…`) : "Unassigned"}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            task.priority === "High"
                              ? "bg-red-50 text-red-600"
                              : task.priority === "Medium"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            task.status === "Completed"
                              ? "bg-green-50 text-green-600"
                              : task.status === "In Progress"
                                ? "bg-purple-50 text-purple-600"
                                : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(task.dueDate)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Comments on ${task.title}`} title="Comments" onClick={() => { setSelectedTask(task); setCollabError(""); }} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><MessageCircle size={17}/></button>
                          {canManageTask(task) && <button
                            type="button"
                            aria-label={`Edit ${task.title}`}
                            title="Edit task"
                            onClick={() => openEditModal(task)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                          >
                            <Pencil size={17} />
                          </button>}
                          {canManageTask(task) && <button
                            type="button"
                            aria-label={`Delete ${task.title}`}
                            title="Delete task"
                            onClick={() => handleDeleteTask(task)}
                            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={17} />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-10 text-center text-sm text-slate-400"
                    >
                      No tasks found. Try another search or create a task.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>}
        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-400">
          © 2026 TeamFlow. Built for better teamwork.
        </footer>
      </main>
      {notificationsOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setNotificationsOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-label="Notifications" className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Recent notifications</h2><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={20}/></button></div>
            <p className="mb-4 text-xs text-slate-500">Recent task activity from accessible tasks. Notifications are stored locally as read on this device.</p>
            {activity.filter((item) => item.actor_id !== userId).length ? activity.filter((item) => item.actor_id !== userId).slice(0, 20).map((item) => (
              <div key={item.id} className="border-b py-3 text-sm"><p>{item.details?.title || "Task"} — {item.action.replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></div>
            )) : <p className="text-sm text-slate-500">No recent team activity.</p>}
          </section>
        </div>
      )}
      {selectedTask && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTask(null); }}>
          <section role="dialog" aria-modal="true" aria-label="Task comments" className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{selectedTask.title}</h2><p className="text-sm text-slate-500">Task comments</p></div><button onClick={() => setSelectedTask(null)} aria-label="Close comments"><X size={20}/></button></div>
            {collabError && <p role="alert" className="mb-3 text-sm text-red-600">{collabError}</p>}
            <div className="min-h-24 flex-1 space-y-3 overflow-y-auto py-3">
              {commentsLoading ? <p className="text-sm text-slate-500">Loading comments...</p> : comments.length ? comments.map((comment) => (
                <div key={comment.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="whitespace-pre-wrap break-words">{comment.body}</p><p className="mt-2 text-xs text-slate-500">{comment.user_id === userId ? "You" : "Team member"} · {new Date(comment.created_at).toLocaleString()}</p></div>
              )) : <p className="text-sm text-slate-500">No comments yet.</p>}
            </div>
            <form onSubmit={submitComment} className="mt-4 flex gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={2000} required placeholder="Write a comment..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"/><button type="submit" disabled={commentBusy || !commentText.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Post</button></form>
          </section>
        </div>
      )}
      {/* Profile dialog */}
      {profileOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 id="profile-dialog-title" className="text-xl font-bold text-slate-900">Your profile</h2>
              <button type="button" aria-label="Close profile" onClick={() => setProfileOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20}/></button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-4xl font-bold text-white">
                {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Profile photo" className="h-full w-full object-cover" /> : profileInitial}
              </div>
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 ${profileBusy ? "pointer-events-none opacity-50" : ""}`}>
                <Camera size={16}/> Upload profile photo
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadProfilePhoto} disabled={profileBusy}/>
              </label>
              <p className="text-xs text-slate-400">JPG, PNG or WebP · Maximum 2 MB</p>
            </div>
            {profileError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}
            {profileNotice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{profileNotice}</p>}
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registered name</p>
                {editingName ? (
                  <form onSubmit={saveProfileName} className="mt-2 flex gap-2">
                    <input aria-label="Your name" autoFocus required maxLength={100} value={profileNameInput}
                      onChange={(event) => setProfileNameInput(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    <button disabled={profileBusy} type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
                    <button type="button" onClick={() => setEditingName(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
                  </form>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-900">{profileName || "Name not set"}</span>
                    <button type="button" onClick={() => { setProfileNameInput(profileName); setEditingName(true); setProfileError(""); }}
                      className="flex items-center gap-1 text-sm font-semibold text-blue-600"><Pencil size={15}/> Edit name</button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Signed-in email</p>
                <p className="mt-1 break-all text-sm font-medium text-slate-800">{userEmail}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Teams Modal */}
      {isTeamsModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsTeamsModalOpen(false);
              setIsCreateTeamOpen(false);
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="teams-modal-title"
            className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 id="teams-modal-title" className="text-xl font-bold text-slate-900">Your Teams</h2>
                <p className="mt-1 text-sm text-slate-500">Create and manage your TeamFlow workspaces.</p>
              </div>
              <button type="button" aria-label="Close teams"
                onClick={() => { setIsTeamsModalOpen(false); setIsCreateTeamOpen(false); }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {teamError && (
              <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{teamError}</p>
            )}

            {invitationNotice && (
              <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {invitationNotice}
              </p>
            )}

            <section className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4" aria-label="Pending team invitations">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">Pending Invitations</h3>
                  <p className="mt-1 text-xs text-slate-500">Invitations for {userEmail || "your account"}</p>
                </div>
                <button type="button" onClick={handleRefreshInvitations} disabled={invitationsLoading}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-60">
                  Refresh
                </button>
              </div>
              {invitationError && <p role="alert" className="mb-3 text-sm text-red-600">{invitationError}</p>}
              {invitationsLoading ? (
                <p className="text-sm text-slate-500">Loading invitations...</p>
              ) : pendingInvitations.length === 0 ? (
                <p className="text-sm text-slate-500">No pending invitations.</p>
              ) : (
                <div className="space-y-2">
                  {pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">Team invitation</p>
                        <p className="break-all text-xs text-slate-500">Team ID: {invitation.team_id}</p>
                        <p className="text-xs text-slate-500">Expires {new Date(invitation.expires_at).toLocaleDateString()}</p>
                      </div>
                      <button type="button" onClick={() => handleAcceptInvitation(invitation)}
                        disabled={acceptingInvitationId !== null}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                        {acceptingInvitationId === invitation.id ? "Accepting..." : "Accept Invitation"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mb-5 flex justify-end">
              <button type="button"
                onClick={() => { setTeamError(""); setIsCreateTeamOpen((current) => !current); }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus size={17} /> Create Team
              </button>
            </div>

            {isCreateTeamOpen && (
              <form onSubmit={handleCreateTeam} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium text-slate-700">Team name *</label>
                  <input id="team-name" value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="e.g. Product Development" maxLength={80} required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label htmlFor="team-description" className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                  <textarea id="team-description" value={teamDescription}
                    onChange={(event) => setTeamDescription(event.target.value)}
                    placeholder="What does this team work on?" rows={2} maxLength={500}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateTeamOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={creatingTeam}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {creatingTeam ? "Creating..." : "Save Team"}
                  </button>
                </div>
              </form>
            )}

            {teamsLoading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading teams...</p>
            ) : teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Users size={20} /></div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{team.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{team.description || "No description added."}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                            <Users size={14} />
                            {membersLoading ? "Loading members..." : memberError ? "Member count unavailable" : `${new Set(teamMembers.filter((member) => member.team_id === team.id).map((member) => member.user_id)).size} members`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {team.owner_id === userId ? "Owner" : "Member"}
                        </span>
                        {team.owner_id === userId && (
                          <button
                            type="button"
                            onClick={() => {
                              setTeamError("");
                              setInvitationNotice("");
                              setInviteEmail("");
                              setInviteTeamId((current) => current === team.id ? null : team.id);
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Invite member
                          </button>
                        )}
                      </div>
                    </div>
                    {inviteTeamId === team.id && (
                      <form onSubmit={(event) => handleCreateInvitation(event, team)}
                        className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                        <input
                          type="email"
                          aria-label={`Email address to invite to ${team.name}`}
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          placeholder="Member email address"
                          required
                          maxLength={254}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                        <button type="submit" disabled={creatingInvitation}
                          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                          {creatingInvitation ? "Saving and sending..." : "Send invitation"}
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
                <Users className="mx-auto mb-3 text-slate-400" size={28} />
                <p className="font-semibold text-slate-700">No teams yet</p>
                <p className="mt-1 text-sm text-slate-500">Create your first team to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2
                  id="create-task-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {editingTaskId !== null ? "Edit Task" : "Create New Task"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a task to your workspace.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Task Title *
                </label>
                <input
                  id="task-title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="task-description"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="task-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your task..."
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="task-team-id" className="mb-2 block text-sm font-medium text-slate-700">Task workspace</label>
                <select id="task-team-id" value={formData.teamId}
                  disabled={editingTaskId !== null}
                  onChange={(event) => setFormData((current) => ({ ...current, teamId: event.target.value, assignedTo: "" }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100">
                  <option value="">Personal task</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
                {editingTaskId !== null && <p className="mt-1 text-xs text-slate-500">A task's workspace cannot be changed after creation.</p>}
              </div>
              {formData.teamId && (
                <div>
                  <label htmlFor="task-assigned-to" className="mb-2 block text-sm font-medium text-slate-700">Assign to team member</label>
                  <select id="task-assigned-to" value={formData.assignedTo}
                    onChange={handleInputChange} name="assignedTo"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500">
                    <option value="">Unassigned</option>
                    {teamMembers.filter((member) => member.team_id === formData.teamId).map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.user_id === userId ? "You" : `Member ${member.user_id.slice(0, 8)}`}
                        {member.role === "owner" ? " (Owner)" : ""}
                      </option>
                    ))}
                  </select>
                  {memberError && <p role="alert" className="mt-1 text-xs text-red-600">{memberError}</p>}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="task-status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Status
                  </label>
                  <select
                    id="task-status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="task-due-date"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Due Date
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingTask
                    ? "Saving..."
                    : editingTaskId !== null
                      ? "Save Changes"
                      : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
const needsProfileCompletion = (user) => {
  const metadata = user?.user_metadata || {};
  return !String(metadata.full_name || metadata.name || "").trim() ||
    !String(metadata.gender || "").trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(metadata.date_of_birth || "")) ||
    !/^\+[1-9]\d{7,14}$/.test(String(metadata.mobile_number || ""));
};

function CompleteProfile({ session, onLogout }) {
  const metadata = session.user.user_metadata || {};
  const [name, setName] = useState(metadata.full_name || metadata.name || "");
  const [gender, setGender] = useState(metadata.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(metadata.date_of_birth || "");
  const [mobileNumber, setMobileNumber] = useState(metadata.mobile_number || "");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    const cleanMobile = mobileNumber.replace(/[\s()-]/g, "");
    const today = new Date().toLocaleDateString("en-CA");
    if (!name.trim() || !gender || !dateOfBirth || dateOfBirth > today ||
        Number.isNaN(Date.parse(dateOfBirth)) || !/^\+[1-9]\d{7,14}$/.test(cleanMobile)) {
      setErrorMessage("Enter all required details, a valid birth date, and a phone number with country code.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: {
      full_name: name.trim(), gender, date_of_birth: dateOfBirth, mobile_number: cleanMobile,
    }});
    if (error) setErrorMessage(error.message);
    else {
      // Updating auth metadata triggers USER_UPDATED; App will show the dashboard.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) setErrorMessage(refreshError.message);
    }
    setBusy(false);
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600">TeamFlow.</h1>
        <h2 className="mt-5 text-xl font-bold text-slate-900">Complete your profile</h2>
        <p className="mt-2 text-sm text-slate-600">Your Google account provided your sign-in details. Complete the required fields to continue.</p>
        <p className="mt-2 text-xs text-slate-500">Signed in as {session.user.email}</p>
        <form onSubmit={save} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Full name *
            <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Gender *
            <select required value={gender} onChange={(e) => setGender(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
              <option value="">Select gender</option>
              <option>Male</option><option>Female</option><option>Non-binary</option>
              <option>Prefer to self-describe</option><option>Prefer not to say</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">Date of birth *
            <input required type="date" max={new Date().toLocaleDateString("en-CA")}
              value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Mobile number (with country code) *
            <input required type="tel" placeholder="+919876543210" value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2" />
          </label>
          {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Saving..." : "Save and continue"}
          </button>
        </form>
        <button type="button" onClick={onLogout} className="mt-4 text-sm text-slate-500 underline">Sign out</button>
      </section>
    </div>
  );
}

function SuccessToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" className="fixed right-4 top-4 z-[200] w-[min(92vw,420px)] rounded-xl border border-green-200 bg-white p-4 text-slate-900 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-xl text-green-600">✓</span>
          <div><p className="font-semibold">Success</p><p className="mt-1 text-sm">{message}</p></div>
        </div>
        <button type="button" aria-label="Close notification" onClick={onClose} className="text-slate-500 hover:text-slate-900">✕</button>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error(error);
      setSession(data?.session ?? null);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setCheckingSession(false);
      // Only notify for an actual sign-in, not an existing restored session or token refresh.
      if (event === "SIGNED_IN") setToast("Login Successfully!");
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error);
      setToast("Could not log out. Please try again.");
      return;
    }
    setSession(null);
    setToast("You Have Logout Successfully!");
  };

  const content = checkingSession
    ? <div>Loading TeamFlow...</div>
    : !session
      ? <Auth onNotify={setToast} />
      : needsProfileCompletion(session.user)
        ? <CompleteProfile session={session} onLogout={handleLogout} />
        : <Dashboard session={session} onLogout={handleLogout} />;

  return <>{content}<SuccessToast message={toast} onClose={() => setToast("")} /></>;
}
