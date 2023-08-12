import { writable } from "svelte/store";
import { toInt, isPositiveInteger } from "./utils";
import type TodoistPlugin from ".";
import { App, PluginSettingTab, Setting } from "obsidian";
import { getTokenPath } from "./token";

export const SettingsInstance = writable<ISettings>({
  fadeToggle: true,

  autoRefreshToggle: false,
  autoRefreshInterval: 60,

  renderHeading: true,

  renderDescription: true,

  renderDate: true,
  renderDateIcon: true,
  renderAppendDate: false,
  appendedDateFormat: "M/D/YY",

  renderProject: true,
  renderProjectIcon: true,

  renderLabels: true,
  renderLabelsIcon: true,

  debugLogging: false,
});

export interface ISettings {
  fadeToggle: boolean;
  autoRefreshToggle: boolean;
  autoRefreshInterval: number;

  renderHeading: boolean;

  renderDescription: boolean;

  renderDate: boolean;
  renderDateIcon: boolean;
  renderAppendDate: boolean;
  appendedDateFormat: string;

  renderProject: boolean;
  renderProjectIcon: boolean;

  renderLabels: boolean;
  renderLabelsIcon: boolean;

  debugLogging: boolean;
}

export class SettingsTab extends PluginSettingTab {
  private plugin: TodoistPlugin;

  constructor(app: App, plugin: TodoistPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    this.containerEl.empty();

    this.pluginMetadata();
    this.apiToken();

    this.fadeAnimationSettings();
    this.autoRefreshSettings();

    this.headingSettings();
    this.descriptionSettings();

    this.dateSettings();
    this.projectSettings();

    this.labelsSettings();
    this.debugLogging();
  }

  pluginMetadata() {
    const desc = document.createDocumentFragment();

    const span = document.createElement("span") as HTMLSpanElement;
    span.innerText = "Read the ";

    const changelogLink = document.createElement("a") as HTMLAnchorElement;
    changelogLink.href =
      "https://github.com/jamiebrynes7/obsidian-todoist-plugin/releases";
    changelogLink.innerText = "changelog!";

    span.appendChild(changelogLink);

    desc.appendChild(span);
  }

  apiToken() {
    const desc = document.createDocumentFragment();
    desc.createEl("span", null, (span) => {
      span.innerText =
        "The Todoist API token to use when fetching tasks. You will need to restart Obsidian after setting this. You can find this token ";

      span.createEl("a", null, (link) => {
        link.href = "https://todoist.com/prefs/integrations";
        link.innerText = "here!";
      });
    });

    new Setting(this.containerEl)
      .setName("Todoist API token")
      .setDesc(desc)
      .addTextArea(async (text) => {
        try {
          text.setValue(
            await this.app.vault.adapter.read(getTokenPath(this.app.vault))
          );
        } catch (e) {
          /* Throw away read error if file does not exist. */
        }

        text.onChange(async (value) => {
          await this.app.vault.adapter.write(
            getTokenPath(this.app.vault),
            value
          );
        });
      });
  }

  fadeAnimationSettings() {
    new Setting(this.containerEl)
      .setName("Task fade animation")
      .setDesc("Whether tasks should fade in and out when added or removed.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.fadeToggle);
        toggle.onChange(async (value) => {
          this.plugin.writeOptions((old) => (old.fadeToggle = value));
        });
      });
  }

  autoRefreshSettings() {
    new Setting(this.containerEl)
      .setName("Auto-refresh")
      .setDesc("Whether queries should auto-refresh at a set interval")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.autoRefreshToggle);
        toggle.onChange((value) => {
          this.plugin.writeOptions((old) => (old.autoRefreshToggle = value));
        });
      });

    new Setting(this.containerEl)
      .setName("Auto-refresh interval")
      .setDesc(
        "The interval (in seconds) that queries should auto-refresh by default. Integer numbers only."
      )
      .addText((setting) => {
        setting.setValue(`${this.plugin.options.autoRefreshInterval}`);
        setting.onChange(async (value) => {
          const newSetting = value.trim();

          if (newSetting.length == 0) {
            return;
          }

          if (isPositiveInteger(newSetting)) {
            await this.plugin.writeOptions(
              (old) => (old.autoRefreshInterval = toInt(newSetting))
            );
          } else {
            setting.setValue(`${this.plugin.options.autoRefreshInterval}`);
          }
        });
      });
  }

  headingSettings() {
    new Setting(this.containerEl)
      .setName("Render list heading")
      .setDesc(
        "Whether the list name heading should be rendered before the tasks."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.renderHeading);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions((old) => (old.renderHeading = value));
        });
      });
  }

  descriptionSettings() {
    new Setting(this.containerEl)
      .setName("Render descriptions")
      .setDesc("Whether descriptions should be rendered with tasks.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.renderDescription);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions(
            (old) => (old.renderDescription = value)
          );
        });
      });
  }

  dateSettings() {
    new Setting(this.containerEl)
      .setName("Render dates")
      .setDesc("Whether dates should be rendered with tasks.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.renderDate);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions((old) => (old.renderDate = value));
        });
      });

    new Setting(this.containerEl)
      .setName("Render date icon")
      .setDesc("Whether rendered dates should include an icon.")
      .addToggle((setting) => {
        setting.setValue(this.plugin.options.renderDateIcon);
        setting.onChange(async (value) => {
          await this.plugin.writeOptions((old) => (old.renderDateIcon = value));
        });
      });

    new Setting(this.containerEl)
      .setName("Render appended date")
      .setDesc("Whether the task date should be appended to the task name.")
      .addToggle((setting) => {
        setting.setValue(this.plugin.options.renderAppendDate);
        setting.onChange(async (value) => {
          await this.plugin.writeOptions(
            (old) => (old.renderAppendDate = value)
          );
        });
      });

    new Setting(this.containerEl)
      .setName("Appended date format")
      .setDesc(
        "The format that will be used for the appended date. Formats must be Moment.js compatible. Examples: M/D/YY, MMMM D, MMM-DD."
      )
      .addText((setting) => {
        setting.setValue(`${this.plugin.options.appendedDateFormat}`);
        setting.onChange(async (value) => {
          const newSetting = value.trim();

          if (newSetting.length == 0) {
            return;
          }
          await this.plugin.writeOptions(
            (old) => (old.appendedDateFormat = newSetting)
          );
        });
      });
  }

  projectSettings() {
    new Setting(this.containerEl)
      .setName("Render project & section")
      .setDesc("Whether projects & sections should be rendered with tasks.")
      .addToggle((setting) => {
        setting.setValue(this.plugin.options.renderProject);
        setting.onChange(async (value) => {
          await this.plugin.writeOptions((old) => (old.renderProject = value));
        });
      });

    new Setting(this.containerEl)
      .setName("Render project & section icon")
      .setDesc("Whether rendered projects & sections should include an icon.")
      .addToggle((setting) => {
        setting.setValue(this.plugin.options.renderProjectIcon);
        setting.onChange(async (value) => {
          await this.plugin.writeOptions(
            (old) => (old.renderProjectIcon = value)
          );
        });
      });
  }

  labelsSettings() {
    new Setting(this.containerEl)
      .setName("Render labels")
      .setDesc("Whether labels should be rendered with tasks.")
      .addToggle((setting) => {
        setting.setValue(this.plugin.options.renderLabels);
        setting.onChange(async (value) => {
          await this.plugin.writeOptions((old) => (old.renderLabels = value));
        });
      });

    new Setting(this.containerEl)
      .setName("Render labels icon")
      .setDesc("Whether rendered labels should include an icon.")
      .addToggle((setting) => {
        setting.setValue(this.plugin.options.renderLabelsIcon);
        setting.onChange(async (value) => {
          await this.plugin.writeOptions(
            (old) => (old.renderLabelsIcon = value)
          );
        });
      });
  }

  debugLogging() {
    new Setting(this.containerEl)
      .setName("Debug logging")
      .setDesc("Whether debug logging should be on or off.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.options.debugLogging);
        toggle.onChange(async (value) => {
          await this.plugin.writeOptions((old) => (old.debugLogging = value));
        });
      });
  }
}
