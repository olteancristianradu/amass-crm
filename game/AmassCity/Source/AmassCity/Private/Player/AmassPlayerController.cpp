#include "Player/AmassPlayerController.h"

AAmassPlayerController::AAmassPlayerController()
{
	bShowMouseCursor = false;
	bEnableClickEvents = false;
	bEnableMouseOverEvents = false;
}

void AAmassPlayerController::BeginPlay()
{
	Super::BeginPlay();
	SetInputMode(FInputModeGameOnly());
}

void AAmassPlayerController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);
}
