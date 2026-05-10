#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "WantedLevelComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWantedLevelChanged, int32, NewLevel);

UCLASS(ClassGroup = (Amass), meta = (BlueprintSpawnableComponent))
class AMASSCITY_API UWantedLevelComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UWantedLevelComponent();

	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	UFUNCTION(BlueprintCallable, Category = "Amass|Wanted")
	void ReportCrime(int32 Severity);

	UFUNCTION(BlueprintCallable, Category = "Amass|Wanted")
	void ClearWanted();

	UFUNCTION(BlueprintPure, Category = "Amass|Wanted")
	int32 GetLevel() const { return WantedLevel; }

	UPROPERTY(BlueprintAssignable, Category = "Amass|Wanted")
	FOnWantedLevelChanged OnWantedLevelChanged;

protected:
	UPROPERTY(EditDefaultsOnly, Category = "Amass|Wanted", meta = (ClampMin = "0"))
	int32 MaxWantedLevel = 5;

	UPROPERTY(EditDefaultsOnly, Category = "Amass|Wanted")
	float DecaySecondsPerLevel = 30.f;

	UPROPERTY(EditDefaultsOnly, Category = "Amass|Wanted")
	float DecayDelayAfterCrime = 10.f;

private:
	int32 WantedLevel = 0;
	float HeatPoints = 0.f;
	float TimeSinceLastCrime = 0.f;

	void RecomputeLevel();
};
