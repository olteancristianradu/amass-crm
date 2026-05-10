#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "AmassCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UInputAction;
class UInputMappingContext;
class AAmassVehicleBase;
class UWantedLevelComponent;
class UHealthComponent;

UCLASS()
class AMASSCITY_API AAmassCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AAmassCharacter();

	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
	virtual void PossessedBy(AController* NewController) override;

	UFUNCTION(BlueprintCallable, Category = "Amass|Vehicle")
	void TryEnterVehicle();

	UFUNCTION(BlueprintCallable, Category = "Amass|Vehicle")
	void ExitVehicle();

	UFUNCTION(BlueprintPure, Category = "Amass|Vehicle")
	bool IsInVehicle() const { return CurrentVehicle != nullptr; }

	UFUNCTION(BlueprintPure, Category = "Amass|Player")
	UWantedLevelComponent* GetWantedLevel() const { return WantedLevel; }

protected:
	virtual void BeginPlay() override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
	TObjectPtr<UCameraComponent> FollowCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UWantedLevelComponent> WantedLevel;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UHealthComponent> Health;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> MoveAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> LookAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> JumpAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> SprintAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> InteractAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> FireAction;

	UPROPERTY(EditDefaultsOnly, Category = "Movement")
	float WalkSpeed = 400.f;

	UPROPERTY(EditDefaultsOnly, Category = "Movement")
	float SprintSpeed = 800.f;

	UPROPERTY(EditDefaultsOnly, Category = "Vehicle")
	float VehicleInteractRange = 250.f;

	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void StartSprint();
	void StopSprint();
	void Interact();
	void Fire();

private:
	UPROPERTY(Transient)
	TObjectPtr<AAmassVehicleBase> CurrentVehicle;

	AAmassVehicleBase* FindNearestVehicle() const;
	void ApplyDefaultMappingContext();
};
