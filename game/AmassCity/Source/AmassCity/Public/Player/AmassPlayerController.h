#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "AmassPlayerController.generated.h"

UCLASS()
class AMASSCITY_API AAmassPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	AAmassPlayerController();

protected:
	virtual void BeginPlay() override;
	virtual void OnPossess(APawn* InPawn) override;
};
