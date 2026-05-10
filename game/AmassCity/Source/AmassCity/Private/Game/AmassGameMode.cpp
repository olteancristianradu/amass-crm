#include "Game/AmassGameMode.h"

#include "Player/AmassCharacter.h"
#include "Player/AmassPlayerController.h"
#include "Game/AmassGameState.h"
#include "UI/AmassHUD.h"

AAmassGameMode::AAmassGameMode()
{
	DefaultPawnClass      = AAmassCharacter::StaticClass();
	PlayerControllerClass = AAmassPlayerController::StaticClass();
	GameStateClass        = AAmassGameState::StaticClass();
	HUDClass              = AAmassHUD::StaticClass();
}
