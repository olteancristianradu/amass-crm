#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "GameplayTagContainer.h"
#include "MissionSystem.generated.h"

UENUM(BlueprintType)
enum class EMissionStatus : uint8
{
	Locked,
	Available,
	Active,
	Completed,
	Failed
};

USTRUCT(BlueprintType)
struct FMissionDefinition
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	FName Id;

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (MultiLine = true))
	FText Description;

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	FGameplayTagContainer RequiredTags;

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	int32 RewardCash = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	int32 MinReputation = 0;
};

USTRUCT(BlueprintType)
struct FMissionState
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly)
	FName Id;

	UPROPERTY(BlueprintReadOnly)
	EMissionStatus Status = EMissionStatus::Locked;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnMissionStatusChanged, FName, MissionId, EMissionStatus, NewStatus);

UCLASS()
class AMASSCITY_API UMissionSystem : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	UFUNCTION(BlueprintCallable, Category = "Amass|Missions")
	void RegisterMission(const FMissionDefinition& Definition);

	UFUNCTION(BlueprintCallable, Category = "Amass|Missions")
	bool StartMission(FName MissionId);

	UFUNCTION(BlueprintCallable, Category = "Amass|Missions")
	bool CompleteMission(FName MissionId);

	UFUNCTION(BlueprintCallable, Category = "Amass|Missions")
	bool FailMission(FName MissionId);

	UFUNCTION(BlueprintPure, Category = "Amass|Missions")
	EMissionStatus GetStatus(FName MissionId) const;

	UPROPERTY(BlueprintAssignable, Category = "Amass|Missions")
	FOnMissionStatusChanged OnMissionStatusChanged;

private:
	UPROPERTY() TMap<FName, FMissionDefinition> Definitions;
	UPROPERTY() TMap<FName, FMissionState>      States;

	void SetStatus(FName MissionId, EMissionStatus NewStatus);
};
