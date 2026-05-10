using UnrealBuildTool;
using System.Collections.Generic;

public class AmassCityEditorTarget : TargetRules
{
	public AmassCityEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("AmassCity");
	}
}
