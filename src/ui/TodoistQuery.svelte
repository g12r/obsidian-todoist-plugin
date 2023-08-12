<script lang="ts">
  import { onMount, onDestroy, setContext } from "svelte";
  import type { App } from "obsidian";
  import { SettingsInstance } from "../settings";
  import type { ISettings } from "../settings";
  import type { Query } from "../query/query";
  import type { TodoistApi } from "../api/api";
  import type { Task, Project } from "../api/models";
  import TaskList from "./TaskList.svelte";
  import GroupedTaskList from "./GroupedTaskList.svelte";
  import { Result } from "../result";
  import ErrorDisplay from "./ErrorDisplay.svelte";
  import NoTaskDisplay from "./NoTaskDisplay.svelte";
  import { APP_CONTEXT_KEY } from "../utils";
  import CreateTaskModal from "../modals/createTask/createTaskModal";

  export let query: Query;
  export let api: TodoistApi;
  export let app: App;

  setContext(APP_CONTEXT_KEY, app);

  let settings: ISettings = null;
  let autoRefreshIntervalId: number = null;
  let fetchedOnce: boolean = false;

  const settingsUnsub = SettingsInstance.subscribe((value) => {
    settings = value;
  });

  $: {
    if (query?.autorefresh) {
      // First, if query.autorefresh is set.. we always use that value.
      if (autoRefreshIntervalId == null) {
        autoRefreshIntervalId = window.setInterval(async () => {
          await fetchTodos();
        }, query.autorefresh * 1000);
      }
    } else {
      // Otherwise we use the settings value.
      if (autoRefreshIntervalId != null) {
        clearInterval(autoRefreshIntervalId);
        autoRefreshIntervalId = null;
      }

      if (settings.autoRefreshToggle) {
        autoRefreshIntervalId = window.setInterval(async () => {
          await fetchTodos();
        }, settings.autoRefreshInterval * 1000);
      }
    }
  }

  $: taskCount = query.group
    ? groupedTasks
        .map((prjs) => prjs.reduce((sum, prj) => sum + prj.count(), 0))
        .unwrapOr(0)
    : tasks
        .map((tasks) => tasks.reduce((sum, task) => sum + task.count(), 0))
        .unwrapOr(0);

  $: title = query.name.replace("{task_count}", `${taskCount}`);

  let tasks: Result<Task[], Error> = Result.Ok([]);
  let groupedTasks: Result<Project[], Error> = Result.Ok([]);
  let fetching: boolean = false;
  let adding: boolean = false;

  onMount(async () => {
    await fetchTodos();
  });

  onDestroy(() => {
    settingsUnsub();

    if (autoRefreshIntervalId != null) {
      clearInterval(autoRefreshIntervalId);
    }
  });

  async function fetchTodos() {
    if (fetching) {
      return;
    }

    try {
      fetching = true;
      if (query.group) {
        groupedTasks = await api.getTasksGroupedByProject(query.filter);
      } else {
        tasks = await api.getTasks(query.filter);
      }

      fetchedOnce = true;
    } finally {
      fetching = false;
    }
  }

  // Not sure this really needs to be async -- could use a way to force close modal if failure
  async function addTodo() {
    if (adding) {
      return;
    }

    try {
      adding = true;
      new CreateTaskModal(app, api, false, fetchTodos);
    } finally {
      adding = false;
    }
  }
</script>

<div class="todoist-list">
  {#if settings.renderHeading && title}
    <h4 class="todoist-query-title">{title}</h4>
  {/if}
  {#if fetchedOnce}
    {#if query.group}
      {#if groupedTasks.isOk()}
        {#if groupedTasks.unwrap().length == 0}
          <NoTaskDisplay />
        {:else}
          {#each groupedTasks.unwrap() as project (project.projectID)}
            <GroupedTaskList
              {project}
              {settings}
              {api}
              sorting={query.sorting ?? []}
            />
          {/each}
        {/if}
      {:else}
        <ErrorDisplay error={groupedTasks.unwrapErr()} />
      {/if}
    {:else if tasks.isOk()}
      <TaskList
        tasks={tasks.unwrap()}
        {settings}
        {api}
        sorting={query.sorting ?? []}
      />
    {:else}
      <ErrorDisplay error={tasks.unwrapErr()} />
    {/if}
  {/if}
</div>
<div
  class="edit-block-button block-button block-button-1"
  aria-label="Refresh tasks"
  on:click={async () => {
    await fetchTodos();
  }}
  on:keypress={async () => {
    await fetchTodos();
  }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={fetching
      ? "svg-icon lucide-code-2 todoist-refresh-spin"
      : "svg-icon lucide-code-2"}
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"
    />
  </svg>
</div>
<div
  class="edit-block-button block-button block-button-2"
  aria-label="Add task"
  on:click={async () => {
    await addTodo();
  }}
  on:keypress={async () => {
    await addTodo();
  }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="0"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="svg-icon lucide-code-2"
  >
    <path
      fill="currentColor"
      d="M18 12.998h-5v5a1 1 0 0 1-2 0v-5H6a1 1 0 0 1 0-2h5v-5a1 1 0 0 1 2 0v5h5a1 1 0 0 1 0 2z"
    />
  </svg>
</div>
