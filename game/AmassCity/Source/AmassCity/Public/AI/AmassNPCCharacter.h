#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "AmassNPCCharacter.generated.h"

class UHealthComponent;

UENUM(BlueprintType)
enum class ENPCRole : uint8
{
	Civilian,
	Police,
	Vendor,
	Hostile
};

UCLASS()
class AMASSCITY_API AAmassNPCCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AAmassNPCCharacter();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Amass|NPC")
	ENPCRole Role = ENPCRole::Civilian;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UHealthComponent> Health;

protected:
	virtual void BeginPlay() override;
};
