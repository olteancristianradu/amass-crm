#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "AmassHUD.generated.h"

UCLASS()
class AMASSCITY_API AAmassHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

protected:
	void DrawWantedStars();
	void DrawSpeedometer();
	void DrawMinimapPlaceholder();
};
