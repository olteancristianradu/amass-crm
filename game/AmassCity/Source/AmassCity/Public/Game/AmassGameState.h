#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "AmassGameState.generated.h"

UENUM(BlueprintType)
enum class EAmassTimeOfDay : uint8
{
	Dawn,
	Day,
	Dusk,
	Night
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTimeOfDayChanged, EAmassTimeOfDay, NewPhase);

UCLASS()
class AMASSCITY_API AAmassGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	AAmassGameState();

	virtual void Tick(float DeltaSeconds) override;

	UFUNCTION(BlueprintPure, Category = "Amass|World")
	float GetWorldHour() const { return WorldHour; }

	UFUNCTION(BlueprintPure, Category = "Amass|World")
	EAmassTimeOfDay GetTimeOfDay() const { return CurrentPhase; }

	UPROPERTY(BlueprintAssignable, Category = "Amass|World")
	FOnTimeOfDayChanged OnTimeOfDayChanged;

protected:
	UPROPERTY(EditDefaultsOnly, Category = "Amass|World", meta = (ClampMin = "0.1"))
	float MinutesPerRealSecond = 1.f;

	UPROPERTY(EditDefaultsOnly, Category = "Amass|World", meta = (ClampMin = "0.0", ClampMax = "23.999"))
	float StartingHour = 8.f;

private:
	float WorldHour = 8.f;
	EAmassTimeOfDay CurrentPhase = EAmassTimeOfDay::Day;

	EAmassTimeOfDay ComputePhase(float Hour) const;
};
