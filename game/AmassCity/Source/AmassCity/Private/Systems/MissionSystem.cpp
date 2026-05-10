#include "Systems/MissionSystem.h"

void UMissionSystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
}

void UMissionSystem::RegisterMission(const FMissionDefinition& Definition)
{
	if (Definition.Id.IsNone())
	{
		return;
	}
	Definitions.Add(Definition.Id, Definition);
	if (!States.Contains(Definition.Id))
	{
		FMissionState State;
		State.Id = Definition.Id;
		State.Status = EMissionStatus::Available;
		States.Add(Definition.Id, State);
	}
}

bool UMissionSystem::StartMission(FName MissionId)
{
	const FMissionState* State = States.Find(MissionId);
	if (!State || State->Status != EMissionStatus::Available)
	{
		return false;
	}
	SetStatus(MissionId, EMissionStatus::Active);
	return true;
}

bool UMissionSystem::CompleteMission(FName MissionId)
{
	const FMissionState* State = States.Find(MissionId);
	if (!State || State->Status != EMissionStatus::Active)
	{
		return false;
	}
	SetStatus(MissionId, EMissionStatus::Completed);
	return true;
}

bool UMissionSystem::FailMission(FName MissionId)
{
	const FMissionState* State = States.Find(MissionId);
	if (!State || State->Status != EMissionStatus::Active)
	{
		return false;
	}
	SetStatus(MissionId, EMissionStatus::Failed);
	return true;
}

EMissionStatus UMissionSystem::GetStatus(FName MissionId) const
{
	if (const FMissionState* State = States.Find(MissionId))
	{
		return State->Status;
	}
	return EMissionStatus::Locked;
}

void UMissionSystem::SetStatus(FName MissionId, EMissionStatus NewStatus)
{
	FMissionState& State = States.FindOrAdd(MissionId);
	State.Id = MissionId;
	State.Status = NewStatus;
	OnMissionStatusChanged.Broadcast(MissionId, NewStatus);
}
