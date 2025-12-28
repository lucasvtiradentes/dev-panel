import { VscodeColor, VscodeIcon } from './vscode-constants';
import { VscodeHelper } from './vscode-helper';

export class VscodeIcons {
  static readonly HiddenItem = VscodeHelper.createIcon(VscodeIcon.EyeClosed, VscodeColor.DisabledForeground);
  static readonly FavoriteItem = VscodeHelper.createIcon(VscodeIcon.HeartFilled, VscodeColor.ChartsRed);
  static readonly ActiveItem = VscodeHelper.createIcon(VscodeIcon.CircleFilled, VscodeColor.ChartsGreen);

  static readonly TaskDone = VscodeHelper.createIcon(VscodeIcon.PassFilled, VscodeColor.TestingIconPassed);
  static readonly TaskDoing = VscodeHelper.createIcon(VscodeIcon.PlayCircle, VscodeColor.ChartsBlue);
  static readonly TaskBlocked = VscodeHelper.createIcon(VscodeIcon.Error, VscodeColor.ErrorForeground);
  static readonly TaskOverdue = VscodeHelper.createIcon(VscodeIcon.CircleLargeOutline, VscodeColor.ErrorForeground);
  static readonly TaskDefault = VscodeHelper.createIcon(VscodeIcon.CircleLargeOutline);

  static readonly Inbox = VscodeHelper.createIcon(VscodeIcon.Inbox);
  static readonly Milestone = VscodeHelper.createIcon(VscodeIcon.Milestone);
}
